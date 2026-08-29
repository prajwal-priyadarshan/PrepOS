import { create } from 'zustand';
import { IMPORTABLE_EXTENSIONS, importInto } from '@/lib/importPath';
import { joinPath, type TreeNode, vault } from '@/vault';

export type VaultStatus = 'starting' | 'disconnected' | 'connecting' | 'connected';

interface VaultState {
  status: VaultStatus;
  root: string | null;
  tree: TreeNode[];
  error: string | null;
  expanded: Set<string>;
  importing: boolean;

  restore: () => Promise<void>;
  connect: () => Promise<void>;
  refresh: () => Promise<void>;
  disconnect: () => Promise<void>;
  toggleExpanded: (path: string) => void;
  /** Prompt for PDFs or PPTs and copy them into `destDir`. Returns how many landed. */
  importFiles: (destDir: string) => Promise<number>;
  /** Create a folder if it is not there yet. Used when a prep is created. */
  ensureFolder: (path: string) => Promise<boolean>;
  /** Delete a file, or a folder and everything under it. */
  deleteNode: (path: string) => Promise<boolean>;
  /** Rename a file or folder in place, keeping it in the same parent. */
  renameNode: (path: string, newName: string) => Promise<boolean>;
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export const useVault = create<VaultState>((set, get) => ({
  status: 'starting',
  root: null,
  tree: [],
  error: null,
  expanded: new Set<string>(),
  importing: false,

  /**
   * Called once on mount. If persisted-scope did its job this reconnects
   * silently; if it did not, this is where that shows up as a re-prompt.
   */
  async restore() {
    set({ status: 'starting', error: null });
    try {
      const ok = await vault.restore();
      if (!ok) {
        set({ status: 'disconnected', root: null, tree: [] });
        return;
      }
      set({ status: 'connected', root: vault.root() });
      await get().refresh();
    } catch (err) {
      set({ status: 'disconnected', error: message(err) });
    }
  },

  async connect() {
    set({ status: 'connecting', error: null });
    try {
      const picked = await vault.connect();
      if (picked === null) {
        set({ status: get().root === null ? 'disconnected' : 'connected' });
        return;
      }
      set({ status: 'connected', root: picked });
      await get().refresh();
    } catch (err) {
      set({ status: 'disconnected', error: message(err) });
    }
  },

  async refresh() {
    if (!vault.isConnected()) return;
    try {
      set({ tree: await vault.listTree(), error: null });
    } catch (err) {
      set({ error: message(err) });
    }
  },

  async disconnect() {
    await vault.disconnect();
    set({ status: 'disconnected', root: null, tree: [], expanded: new Set() });
  },

  /**
   * Copying rather than moving is the whole point: the source folder keeps
   * whatever the user downloaded, and the vault stays the one place the app
   * reads from. Names are made unique per file, so importing the same paper
   * twice never overwrites the annotated first copy.
   */
  async importFiles(destDir) {
    if (!vault.isConnected()) return 0;
    set({ error: null });

    let sources: string[];
    try {
      sources = await vault.pickFiles({
        extensions: [...IMPORTABLE_EXTENSIONS],
        title: 'Add PDFs or PPTs to the vault',
      });
    } catch (err) {
      set({ error: message(err) });
      return 0;
    }
    if (sources.length === 0) return 0;

    set({ importing: true });
    let added = 0;
    try {
      added = await importInto(vault, destDir, sources);
    } catch (err) {
      set({ error: message(err) });
    } finally {
      set({ importing: false });
      await get().refresh();
    }
    return added;
  },

  async ensureFolder(path) {
    if (!vault.isConnected() || path === '') return true;
    try {
      if (!(await vault.exists(path))) await vault.mkdirp(path);
      await get().refresh();
      return true;
    } catch (err) {
      set({ error: message(err) });
      return false;
    }
  },

  /**
   * Deletes whatever is at `path` - a lone file, or a folder and everything
   * under it. There is no undo: the caller is expected to have confirmed
   * with the user already (see FileTree's two-step confirm).
   */
  async deleteNode(path) {
    if (!vault.isConnected() || path === '') return false;
    set({ error: null });
    try {
      await vault.remove(path);
      await get().refresh();
      return true;
    } catch (err) {
      set({ error: message(err) });
      return false;
    }
  },

  /**
   * Renames a file or folder without moving it to a different parent - the
   * new name is joined onto the existing directory, not taken as a full path.
   */
  async renameNode(path, newName) {
    if (!vault.isConnected() || path === '') return false;
    const trimmed = newName.trim();
    if (trimmed.length === 0) return false;
    const parent = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
    const dest = joinPath(parent, trimmed);
    if (dest === path) return true;
    set({ error: null });
    try {
      if (await vault.exists(dest)) {
        set({ error: `${trimmed} already exists here.` });
        return false;
      }
      await vault.rename(path, dest);
      await get().refresh();
      return true;
    } catch (err) {
      set({ error: message(err) });
      return false;
    }
  },

  toggleExpanded(path) {
    const next = new Set(get().expanded);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    set({ expanded: next });
  },
}));
