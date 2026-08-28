import { create } from 'zustand';
import { importInto, PDF_EXTENSION } from '@/lib/importPath';
import { type TreeNode, vault } from '@/vault';

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
  /** Prompt for PDFs and copy them into `destDir`. Returns how many landed. */
  importPdfs: (destDir: string) => Promise<number>;
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
  async importPdfs(destDir) {
    if (!vault.isConnected()) return 0;
    set({ error: null });

    let sources: string[];
    try {
      sources = await vault.pickFiles({
        extensions: [PDF_EXTENSION],
        title: 'Add PDFs to the vault',
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

  toggleExpanded(path) {
    const next = new Set(get().expanded);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    set({ expanded: next });
  },
}));
