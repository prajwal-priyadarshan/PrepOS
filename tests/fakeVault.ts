import type { AppendHandle, FileStat, TreeNode, VaultAdapter } from '../src/vault/VaultAdapter';

/**
 * In-memory VaultAdapter. Exists so persistence can be tested without Tauri -
 * which is the entire reason disk access sits behind an interface.
 */
export class FakeVault implements VaultAdapter {
  files = new Map<string, string>();
  dirs = new Set<string>(['', '.catprep', '.catprep/backups']);
  /** Every operation, in order, for asserting the write path. */
  ops: string[] = [];

  connect(): Promise<string | null> {
    return Promise.resolve('/fake');
  }
  restore(): Promise<boolean> {
    return Promise.resolve(true);
  }
  disconnect(): Promise<void> {
    return Promise.resolve();
  }
  isConnected(): boolean {
    return true;
  }
  root(): string {
    return '/fake';
  }

  listTree(): Promise<TreeNode[]> {
    return this.listDir('');
  }

  listDir(path: string): Promise<TreeNode[]> {
    if (!this.dirs.has(path)) return Promise.reject(new Error(`no such dir: ${path}`));
    const prefix = path === '' ? '' : `${path}/`;
    const out: TreeNode[] = [];
    for (const file of this.files.keys()) {
      if (file.startsWith(prefix) && !file.slice(prefix.length).includes('/')) {
        out.push({ name: file.slice(prefix.length), path: file, isDirectory: false });
      }
    }
    return Promise.resolve(out);
  }

  readFile(path: string): Promise<Uint8Array> {
    return this.readText(path).then((t) => new TextEncoder().encode(t));
  }

  readText(path: string): Promise<string> {
    const value = this.files.get(path);
    if (value === undefined) return Promise.reject(new Error(`no such file: ${path}`));
    this.ops.push(`read ${path}`);
    return Promise.resolve(value);
  }

  writeFile(path: string, data: Uint8Array | string): Promise<void> {
    const text = typeof data === 'string' ? data : new TextDecoder().decode(data);
    this.files.set(path, text);
    this.ops.push(`write ${path}`);
    return Promise.resolve();
  }

  async writeTextAtomic(path: string, data: string): Promise<void> {
    await this.writeFile(`${path}.tmp`, data);
    const tmp = this.files.get(`${path}.tmp`);
    this.files.delete(`${path}.tmp`);
    this.files.set(path, tmp ?? '');
    this.ops.push(`rename ${path}.tmp -> ${path}`);
  }

  openAppend(path: string): Promise<AppendHandle> {
    const self = this;
    return Promise.resolve({
      write(chunk: Uint8Array): Promise<void> {
        self.files.set(path, (self.files.get(path) ?? '') + new TextDecoder().decode(chunk));
        return Promise.resolve();
      },
      close(): Promise<void> {
        self.ops.push(`close ${path}`);
        return Promise.resolve();
      },
    });
  }

  /** What the next pickFiles() returns - the dialog the user never sees here. */
  picks: string[] = [];
  /** Files outside the vault, by absolute path. */
  outside = new Map<string, string>();

  pickFiles(): Promise<string[]> {
    return Promise.resolve(this.picks);
  }

  importFile(sourceAbsolutePath: string, destPath: string): Promise<void> {
    const value = this.outside.get(sourceAbsolutePath);
    if (value === undefined) {
      return Promise.reject(new Error(`no such source: ${sourceAbsolutePath}`));
    }
    this.files.set(destPath, value);
    this.ops.push(`import ${sourceAbsolutePath} -> ${destPath}`);
    return Promise.resolve();
  }

  exists(path: string): Promise<boolean> {
    return Promise.resolve(this.files.has(path) || this.dirs.has(path));
  }

  mkdirp(path: string): Promise<void> {
    this.dirs.add(path);
    this.ops.push(`mkdir ${path}`);
    return Promise.resolve();
  }

  copyFile(from: string, to: string): Promise<void> {
    const value = this.files.get(from);
    if (value === undefined) return Promise.reject(new Error(`no such file: ${from}`));
    this.files.set(to, value);
    this.ops.push(`copy ${from} -> ${to}`);
    return Promise.resolve();
  }

  remove(path: string): Promise<void> {
    this.files.delete(path);
    this.ops.push(`remove ${path}`);
    return Promise.resolve();
  }

  stat(path: string): Promise<FileStat> {
    const value = this.files.get(path);
    if (value === undefined) return Promise.reject(new Error(`no such file: ${path}`));
    return Promise.resolve({ size: value.length, mtimeMs: 0 });
  }
}
