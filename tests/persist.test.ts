import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type AppState, emptyState, newId } from '../src/lib/model';
import {
  BACKUPS_KEPT,
  backupNameFor,
  backupsToPrune,
  deserialise,
  listSnapshots,
  migrate,
  StatePersister,
  serialise,
} from '../src/lib/persist';
import { STATE_PATH } from '../src/vault/VaultAdapter';
import { FakeVault } from './fakeVault';

function populated(): AppState {
  const state = emptyState();
  state.sessions.push({
    id: newId(),
    studyDay: '2026-08-27',
    startedAt: '2026-08-27T18:30:00.000Z',
    activeSeconds: 2700,
    section: 'QA',
    filePath: 'QA/Quantum Cat.pdf',
    attempted: 20,
    correct: 14,
  });
  state.reading.push({
    id: newId(),
    studyDay: '2026-08-27',
    source: 'Aeon',
    title: 'On boredom',
    minutes: 18,
    summary: 'Boredom is attention without an object.',
  });
  state.errors.push({
    id: newId(),
    studyDay: '2026-08-27',
    section: 'QA',
    topic: 'Time and work',
    cause: 'silly-mistake',
    note: 'Inverted the rate.',
  });
  state.lastPage['QA/Quantum Cat.pdf'] = 214;
  state.streakFreezesUsed.push('2026-08-25');
  return state;
}

describe('serialise / deserialise', () => {
  it('round-trips a populated state unchanged', () => {
    const original = populated();
    expect(deserialise(serialise(original))).toEqual(original);
  });

  it('round-trips an empty state unchanged', () => {
    expect(deserialise(serialise(emptyState()))).toEqual(emptyState());
  });

  it('writes readable JSON - the file is meant to be openable by hand', () => {
    expect(serialise(emptyState())).toContain('\n');
  });
});

describe('migrate', () => {
  it('fills every missing collection', () => {
    expect(migrate({ version: 1 })).toEqual(emptyState());
  });

  it('survives fields of the wrong type', () => {
    const result = migrate({
      version: 1,
      sessions: 'not an array',
      reading: null,
      lastPage: 'nope',
      streakFreezesUsed: [1, '2026-08-25', null],
    });
    expect(result.sessions).toEqual([]);
    expect(result.reading).toEqual([]);
    expect(result.lastPage).toEqual({});
    expect(result.streakFreezesUsed).toEqual(['2026-08-25']);
  });

  it('drops non-numeric page positions but keeps good ones', () => {
    const result = migrate({ lastPage: { 'a.pdf': 12, 'b.pdf': 'x', 'c.pdf': Number.NaN } });
    expect(result.lastPage).toEqual({ 'a.pdf': 12 });
  });

  it('stamps the current version regardless of input', () => {
    expect(migrate({ version: 99 }).version).toBe(1);
    expect(migrate(null).version).toBe(1);
    expect(migrate('garbage').version).toBe(1);
  });

  it('opens rather than crashes on a truncated file', () => {
    expect(deserialise('{"version":1,"sessions":[{"id"')).toEqual(emptyState());
    expect(deserialise('')).toEqual(emptyState());
  });
});

describe('backup rotation', () => {
  it('ignores files that are not snapshots', () => {
    expect(listSnapshots(['state-2026-08-27.json', 'notes.txt', 'state.json'])).toEqual([
      'state-2026-08-27.json',
    ]);
  });

  it('keeps 14 and prunes the oldest first', () => {
    const names = Array.from({ length: 20 }, (_, i) =>
      backupNameFor(`2026-08-${String(i + 1).padStart(2, '0')}`),
    );
    const pruned = backupsToPrune(names);
    expect(pruned).toHaveLength(20 - BACKUPS_KEPT);
    expect(pruned[0]).toBe('state-2026-08-01.json');
    expect(pruned.at(-1)).toBe('state-2026-08-06.json');
  });

  it('prunes nothing below the limit', () => {
    expect(backupsToPrune(['state-2026-08-27.json'])).toEqual([]);
  });
});

describe('StatePersister', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('batches rapid saves into a single write', async () => {
    const vault = new FakeVault();
    const p = new StatePersister(vault, { debounceMs: 1000 });

    p.save(emptyState());
    p.save(emptyState());
    p.save(populated());
    expect(vault.files.has(STATE_PATH)).toBe(false);

    await vi.advanceTimersByTimeAsync(1000);
    expect(vault.ops.filter((o) => o.startsWith('rename'))).toHaveLength(1);
    expect(deserialise(vault.files.get(STATE_PATH) ?? '').sessions).toHaveLength(1);
  });

  it('writes through a tmp file and renames - never a direct overwrite', async () => {
    const vault = new FakeVault();
    const p = new StatePersister(vault, { debounceMs: 10 });
    p.save(populated());
    await vi.advanceTimersByTimeAsync(10);

    expect(vault.ops).toContain(`write ${STATE_PATH}.tmp`);
    expect(vault.ops).toContain(`rename ${STATE_PATH}.tmp -> ${STATE_PATH}`);
    expect(vault.files.has(`${STATE_PATH}.tmp`)).toBe(false);
  });

  it('flush writes immediately and cancels the pending timer', async () => {
    const vault = new FakeVault();
    const p = new StatePersister(vault, { debounceMs: 60_000 });
    p.save(populated());
    await p.flush();

    expect(vault.files.has(STATE_PATH)).toBe(true);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(vault.ops.filter((o) => o.startsWith('rename'))).toHaveLength(1);
  });

  it('flush with nothing pending is a no-op', async () => {
    const vault = new FakeVault();
    await new StatePersister(vault).flush();
    expect(vault.ops).toEqual([]);
  });

  it('round-trips through load()', async () => {
    const vault = new FakeVault();
    const p = new StatePersister(vault, { debounceMs: 1 });
    const original = populated();
    p.save(original);
    await p.flush();
    expect(await p.load()).toEqual(original);
  });

  it('load() on a fresh vault returns empty state, not an error', async () => {
    expect(await new StatePersister(new FakeVault()).load()).toEqual(emptyState());
  });

  it('takes one backup per day, not one per write', async () => {
    const vault = new FakeVault();
    const day1 = new Date(2026, 7, 27, 12).getTime();
    let clock = day1;
    const p = new StatePersister(vault, { debounceMs: 1, now: () => clock });

    // First write: no state.json yet, so nothing to back up.
    p.save(populated());
    await p.flush();
    expect(vault.ops.filter((o) => o.startsWith('copy'))).toHaveLength(0);

    // Second write same day: backs up the existing file once.
    p.save(populated());
    await p.flush();
    const afterFirst = vault.ops.filter((o) => o.startsWith('copy'));
    expect(afterFirst).toHaveLength(1);
    expect(afterFirst[0]).toContain('state-2026-08-27.json');

    // Third write same day: no second copy.
    p.save(populated());
    await p.flush();
    expect(vault.ops.filter((o) => o.startsWith('copy'))).toHaveLength(1);

    // Next day: a new snapshot.
    clock = day1 + 25 * 60 * 60 * 1000;
    p.save(populated());
    await p.flush();
    const copies = vault.ops.filter((o) => o.startsWith('copy'));
    expect(copies).toHaveLength(2);
    expect(copies[1]).toContain('state-2026-08-28.json');
  });
});
