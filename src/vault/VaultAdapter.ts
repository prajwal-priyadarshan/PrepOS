/**
 * The seam.
 *
 * Every byte that reaches disk goes through this interface. Nothing outside
 * src/vault/ may import @tauri-apps/plugin-fs - Biome enforces it. The point is
 * not portability, it is that filesystem code stays independently testable and
 * plugin API churn cannot spread through the app.
 *
 * Paths are always vault-relative with forward slashes ('QA/Arithmetic/set-3.pdf').
 * Resolution against the vault root happens inside the adapter and nowhere else.
 */

export interface TreeNode {
  name: string;
  /** Vault-relative, forward slashes, no leading slash. */
  path: string;
  isDirectory: boolean;
  children?: TreeNode[];
}

/**
 * A serialised append stream.
 *
 * MediaRecorder fires ondataavailable while a previous write may still be in
 * flight; concurrent FileHandle.write calls interleave and corrupt the file.
 * Implementations must queue writes, which is why this is not just a WritableStream.
 */
export interface AppendHandle {
  write(chunk: Uint8Array): Promise<void>;
  close(): Promise<void>;
}

export interface FileStat {
  size: number;
  /** Epoch ms, or null when the platform does not report it. */
  mtimeMs: number | null;
}

export interface PickFilesOptions {
  /** Lower-case, no dot. Omit to accept anything. */
  extensions?: string[];
  title?: string;
}

export interface VaultAdapter {
  /** Prompt for a folder, remember it, scaffold it. Null if the user cancels. */
  connect(): Promise<string | null>;
  /** Re-open the remembered vault with no prompt. False if there is none. */
  restore(): Promise<boolean>;
  disconnect(): Promise<void>;

  isConnected(): boolean;
  /** Absolute path of the vault root. Throws when not connected. */
  root(): string;

  listTree(): Promise<TreeNode[]>;
  listDir(path: string): Promise<TreeNode[]>;

  readFile(path: string): Promise<Uint8Array>;
  readText(path: string): Promise<string>;
  writeFile(path: string, data: Uint8Array | string): Promise<void>;
  /**
   * Write via a .tmp sibling then rename over the target.
   *
   * The vault sits in OneDrive; a direct overwrite lets the sync client observe
   * a half-written state.json and, worse, lose it. Rename is atomic.
   */
  writeTextAtomic(path: string, data: string): Promise<void>;

  openAppend(path: string): Promise<AppendHandle>;

  /**
   * Prompt for files anywhere on disk. Absolute paths; [] when cancelled.
   *
   * Separate from connect() because the pick itself is what grants read access
   * to a path outside the vault - there is no other way to reach one.
   */
  pickFiles(options?: PickFilesOptions): Promise<string[]>;
  /** Copy an absolute outside path to a vault-relative one. */
  importFile(sourceAbsolutePath: string, destPath: string): Promise<void>;
  /**
   * Hand a file to whatever the OS opens it with.
   *
   * For material the in-app reader cannot render - .pptx, .docx - which is
   * everything that is not a PDF, and always will be: the reader is pdf.js.
   */
  openExternally(path: string): Promise<void>;

  exists(path: string): Promise<boolean>;
  mkdirp(path: string): Promise<void>;
  copyFile(from: string, to: string): Promise<void>;
  remove(path: string): Promise<void>;
  stat(path: string): Promise<FileStat>;
}

/** Folders created on first connect. The app reads whatever is there anyway. */
export const SCAFFOLD_DIRS = [
  '.catprep',
  '.catprep/backups',
  'VARC',
  'DILR',
  'QA',
  'Mocks',
  'Speaking',
] as const;

export const STATE_PATH = '.catprep/state.json';
export const BACKUP_DIR = '.catprep/backups';

/** Skipped when walking the tree - noise, or our own bookkeeping. */
const IGNORED = new Set([
  '.catprep',
  '.git',
  'node_modules',
  '$RECYCLE.BIN',
  'System Volume Information',
]);

export function isIgnored(name: string): boolean {
  return IGNORED.has(name) || name.startsWith('.');
}

export function joinPath(...parts: string[]): string {
  return parts
    .filter((p) => p.length > 0)
    .join('/')
    .replace(/\/+/g, '/');
}
