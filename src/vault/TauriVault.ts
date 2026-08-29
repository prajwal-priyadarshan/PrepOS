import { open as openDialog } from '@tauri-apps/plugin-dialog';
import {
  copyFile,
  exists,
  mkdir,
  open as openFile,
  readDir,
  readFile,
  readTextFile,
  remove,
  rename,
  stat,
  writeFile,
  writeTextFile,
} from '@tauri-apps/plugin-fs';
import { openPath } from '@tauri-apps/plugin-opener';
import {
  APP_DIR,
  type AppendHandle,
  type FileStat,
  isIgnored,
  joinPath,
  LEGACY_APP_DIR,
  type PickFilesOptions,
  SCAFFOLD_DIRS,
  type TreeNode,
  type VaultAdapter,
} from './VaultAdapter';
import { clearSavedVaultPath, getSavedVaultPath, saveVaultPath } from './vaultPath';

/** Windows hands back backslashes; everything above this layer speaks '/'. */
function normalise(p: string): string {
  return p.replace(/\\/g, '/').replace(/\/+$/, '');
}

export class TauriVault implements VaultAdapter {
  #root: string | null = null;

  isConnected(): boolean {
    return this.#root !== null;
  }

  root(): string {
    if (this.#root === null) throw new Error('Vault not connected');
    return this.#root;
  }

  #abs(path: string): string {
    return path.length === 0 ? this.root() : `${this.root()}/${path.replace(/^\/+/, '')}`;
  }

  async connect(): Promise<string | null> {
    const picked = await openDialog({
      directory: true,
      multiple: false,
      title: 'Choose your vault folder',
      // Without this the dialog grants a NON-recursive scope: the vault root and
      // one level below it. '.prepos' would be allowed but '.prepos/backups'
      // and every 'DBMS/whatever.pdf' denied. Costs an evening to find later.
      recursive: true,
    });
    if (picked === null) return null;
    const path = normalise(Array.isArray(picked) ? (picked[0] ?? '') : picked);
    if (path.length === 0) return null;

    // The dialog plugin grants fs scope for this path as part of the pick, and
    // persisted-scope restores that grant on the next launch - so there is no
    // custom Rust command for any of this.
    this.#root = path;
    try {
      await this.#scaffold();
    } catch (err) {
      // A vault we cannot write to is not a vault. Do not remember it.
      this.#root = null;
      throw err;
    }
    await saveVaultPath(path);
    return path;
  }

  async restore(): Promise<boolean> {
    const saved = await getSavedVaultPath();
    if (saved === null) return false;
    this.#root = normalise(saved);
    try {
      if (!(await exists(this.root()))) {
        this.#root = null;
        return false;
      }
    } catch {
      // Scope was not restored, or the drive is gone. Force a re-pick rather
      // than leaving the app in a half-connected state.
      this.#root = null;
      return false;
    }
    await this.#scaffold();
    return true;
  }

  async disconnect(): Promise<void> {
    this.#root = null;
    await clearSavedVaultPath();
  }

  async #scaffold(): Promise<void> {
    await this.#adoptLegacyDir();
    for (const dir of SCAFFOLD_DIRS) {
      if (!(await this.exists(dir))) await this.mkdirp(dir);
    }
  }

  /**
   * Carry a CAT-era vault across to the new bookkeeping folder.
   *
   * A vault written while this app was CAT-only keeps its whole history in
   * '.catprep'. Moving it is the only acceptable answer: creating an empty
   * '.prepos' beside it would open to a blank app with a year of work still on
   * disk, which reads as data loss and is the hardest kind to notice.
   *
   * Deliberately not caught. A rename we cannot do means a vault we cannot
   * write, and connect() already refuses to remember one of those - a visible
   * error beats a silent fresh start.
   */
  async #adoptLegacyDir(): Promise<void> {
    if (await this.exists(APP_DIR)) return;
    if (!(await this.exists(LEGACY_APP_DIR))) return;
    await rename(this.#abs(LEGACY_APP_DIR), this.#abs(APP_DIR));
  }

  async listDir(path: string): Promise<TreeNode[]> {
    const entries = await readDir(this.#abs(path));
    const nodes: TreeNode[] = [];
    for (const e of entries) {
      if (isIgnored(e.name)) continue;
      nodes.push({
        name: e.name,
        path: joinPath(path, e.name),
        isDirectory: e.isDirectory,
      });
    }
    return sortNodes(nodes);
  }

  async listTree(): Promise<TreeNode[]> {
    return this.#walk('', 0);
  }

  async #walk(path: string, depth: number): Promise<TreeNode[]> {
    // A study vault is hundreds of files, not hundreds of thousands. The depth
    // cap is a guard against a symlink loop, not a real limit.
    if (depth > 8) return [];
    const nodes = await this.listDir(path);
    for (const node of nodes) {
      if (node.isDirectory) node.children = await this.#walk(node.path, depth + 1);
    }
    return nodes;
  }

  readFile(path: string): Promise<Uint8Array> {
    return readFile(this.#abs(path));
  }

  readText(path: string): Promise<string> {
    return readTextFile(this.#abs(path));
  }

  async writeFile(path: string, data: Uint8Array | string): Promise<void> {
    if (typeof data === 'string') await writeTextFile(this.#abs(path), data);
    else await writeFile(this.#abs(path), data);
  }

  async writeTextAtomic(path: string, data: string): Promise<void> {
    const tmp = `${path}.tmp`;
    await writeTextFile(this.#abs(tmp), data);
    await rename(this.#abs(tmp), this.#abs(path));
  }

  async openAppend(path: string): Promise<AppendHandle> {
    const file = await openFile(this.#abs(path), { write: true, create: true, append: true });

    // Writes are chained rather than issued concurrently: MediaRecorder can fire
    // ondataavailable while the previous write is still in flight, and
    // overlapping writes to one handle interleave in the file.
    let queue: Promise<void> = Promise.resolve();
    let failure: unknown = null;

    return {
      write(chunk: Uint8Array): Promise<void> {
        queue = queue.then(async () => {
          if (failure !== null) return;
          try {
            await file.write(chunk);
          } catch (err) {
            failure = err;
          }
        });
        return queue;
      },
      async close(): Promise<void> {
        await queue;
        await file.close();
        if (failure !== null) throw failure;
      },
    };
  }

  async pickFiles(options: PickFilesOptions = {}): Promise<string[]> {
    const extensions = options.extensions;
    const picked = await openDialog({
      directory: false,
      multiple: true,
      title: options.title ?? 'Add files to the vault',
      // A filter with no extensions matches nothing, so only set one when asked.
      ...(extensions && extensions.length > 0
        ? { filters: [{ name: extensions.join('/').toUpperCase(), extensions }] }
        : {}),
    });
    if (picked === null) return [];
    return (Array.isArray(picked) ? picked : [picked]).map(normalise).filter((p) => p.length > 0);
  }

  async importFile(sourceAbsolutePath: string, destPath: string): Promise<void> {
    // The dialog pick granted read scope on the source; the vault root grant
    // covers the destination. Neither path needs a scope call of its own.
    await copyFile(sourceAbsolutePath, this.#abs(destPath));
  }

  async openExternally(path: string): Promise<void> {
    await openPath(this.#abs(path));
  }

  exists(path: string): Promise<boolean> {
    return exists(this.#abs(path));
  }

  async mkdirp(path: string): Promise<void> {
    await mkdir(this.#abs(path), { recursive: true });
  }

  async copyFile(from: string, to: string): Promise<void> {
    await copyFile(this.#abs(from), this.#abs(to));
  }

  async remove(path: string): Promise<void> {
    await remove(this.#abs(path));
  }

  async stat(path: string): Promise<FileStat> {
    const info = await stat(this.#abs(path));
    return { size: info.size, mtimeMs: info.mtime ? info.mtime.getTime() : null };
  }
}

/** Folders first, then alphabetical - the order a file tree is read in. */
function sortNodes(nodes: TreeNode[]): TreeNode[] {
  return nodes.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
  });
}

export const vault: VaultAdapter = new TauriVault();
