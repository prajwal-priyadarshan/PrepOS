import type { VaultAdapter } from '@/vault/VaultAdapter';
import { BACKUP_DIR, STATE_PATH } from '@/vault/VaultAdapter';
import { type AppState, CURRENT_VERSION, emptyState } from './model';
import { studyDay } from './studyDay';

/** Keep two weeks of daily snapshots. Ten lines that save a year of data. */
export const BACKUPS_KEPT = 14;
export const BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * 10s, not the 2s a local disk would want.
 *
 * The vault sits in OneDrive, and a rewrite every two seconds all session is
 * exactly the pattern that produces 'state-DESKTOP-xxx.json' conflict copies.
 * The longer window is only safe because flush() is wired to blur and close.
 */
export const DEBOUNCE_MS = 10_000;

export function serialise(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

/**
 * Tolerant by design: a missing or malformed field becomes its empty default
 * rather than throwing. Losing one key should never cost the whole history.
 */
export function migrate(data: unknown): AppState {
  const base = emptyState();
  if (typeof data !== 'object' || data === null) return base;
  const raw = data as Record<string, unknown>;

  const lastPage: Record<string, number> = {};
  if (typeof raw.lastPage === 'object' && raw.lastPage !== null) {
    for (const [key, value] of Object.entries(raw.lastPage as Record<string, unknown>)) {
      if (typeof value === 'number' && Number.isFinite(value)) lastPage[key] = value;
    }
  }

  return {
    version: CURRENT_VERSION,
    sessions: asArray(raw.sessions),
    reading: asArray(raw.reading),
    notes: asArray(raw.notes),
    errors: asArray(raw.errors),
    mocks: asArray(raw.mocks),
    recordings: asArray(raw.recordings),
    lastPage,
    streakFreezesUsed: asArray<string>(raw.streakFreezesUsed).filter(
      (d): d is string => typeof d === 'string',
    ),
  };
}

export function deserialise(raw: string): AppState {
  try {
    return migrate(JSON.parse(raw));
  } catch {
    // A truncated or corrupt file must not stop the app from opening; the
    // backups directory is the recovery path, not a crash loop.
    return emptyState();
  }
}

export function backupNameFor(day: string): string {
  return `state-${day}.json`;
}

/** Snapshot filenames, oldest first. Names sort chronologically by construction. */
export function listSnapshots(names: string[]): string[] {
  return names.filter((n) => /^state-\d{4}-\d{2}-\d{2}\.json$/.test(n)).sort();
}

/** Oldest-first list of backups to delete so that `keep` remain. */
export function backupsToPrune(names: string[], keep: number = BACKUPS_KEPT): string[] {
  const snapshots = listSnapshots(names);
  return snapshots.length <= keep ? [] : snapshots.slice(0, snapshots.length - keep);
}

export interface PersisterOptions {
  debounceMs?: number;
  now?: () => number;
}

/**
 * Owns the only write path to state.json.
 *
 * Callers mutate their store and call save(); this batches, writes the whole
 * file atomically, and rotates a daily backup. There is no incremental
 * persistence and there is no second copy of the data to fall out of sync.
 */
export class StatePersister {
  #vault: VaultAdapter;
  #debounceMs: number;
  #now: () => number;
  #timer: ReturnType<typeof setTimeout> | null = null;
  #pending: AppState | null = null;
  #writing: Promise<void> = Promise.resolve();

  constructor(vault: VaultAdapter, options: PersisterOptions = {}) {
    this.#vault = vault;
    this.#debounceMs = options.debounceMs ?? DEBOUNCE_MS;
    this.#now = options.now ?? (() => Date.now());
  }

  async load(): Promise<AppState> {
    if (!(await this.#vault.exists(STATE_PATH))) return emptyState();
    return deserialise(await this.#vault.readText(STATE_PATH));
  }

  /** Batch a write. The last state queued within the window is the one written. */
  save(state: AppState): void {
    this.#pending = state;
    if (this.#timer !== null) return;
    this.#timer = setTimeout(() => {
      this.#timer = null;
      void this.flush();
    }, this.#debounceMs);
  }

  /** Write now. Call on blur and on close, where the debounce would lose data. */
  async flush(): Promise<void> {
    if (this.#timer !== null) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }
    const state = this.#pending;
    if (state === null) return;
    this.#pending = null;

    // Serialise writes so a flush during an in-flight write cannot interleave.
    this.#writing = this.#writing.then(() => this.#write(state));
    return this.#writing;
  }

  async #write(state: AppState): Promise<void> {
    await this.#rotateBackup();
    await this.#vault.writeTextAtomic(STATE_PATH, serialise(state));
  }

  async #rotateBackup(): Promise<void> {
    if (!(await this.#vault.exists(STATE_PATH))) return;

    const entries = await this.#vault.listDir(BACKUP_DIR).catch(() => []);
    const names = entries.map((e) => e.name);
    const newest = listSnapshots(names).at(-1) ?? null;

    if (newest !== null) {
      const stamp = newest.slice('state-'.length, -'.json'.length);
      const age = this.#now() - new Date(`${stamp}T00:00:00`).getTime();
      if (age < BACKUP_INTERVAL_MS) return;
    }

    const target = `${BACKUP_DIR}/${backupNameFor(studyDay(new Date(this.#now())))}`;
    if (await this.#vault.exists(target)) return;
    await this.#vault.copyFile(STATE_PATH, target);

    for (const stale of backupsToPrune([
      ...names,
      backupNameFor(studyDay(new Date(this.#now()))),
    ])) {
      await this.#vault.remove(`${BACKUP_DIR}/${stale}`).catch(() => undefined);
    }
  }
}
