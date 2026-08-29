import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type AppState,
  CURRENT_VERSION,
  DEFAULT_PREP_ID,
  defaultPrep,
  emptyState,
  newId,
} from '../src/lib/model';
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
  // Records name a prep, so a realistic state holds one. emptyState() no longer
  // invents it: a vault with no preps is one that has not been set up.
  state.preps.push(defaultPrep());
  state.activePrepId = DEFAULT_PREP_ID;
  state.sessions.push({
    id: newId(),
    prepId: DEFAULT_PREP_ID,
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
    prepId: DEFAULT_PREP_ID,
    studyDay: '2026-08-27',
    source: 'Aeon',
    title: 'On boredom',
    minutes: 18,
    summary: 'Boredom is attention without an object.',
  });
  state.errors.push({
    id: newId(),
    prepId: DEFAULT_PREP_ID,
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
    expect(migrate({ version: 99 }).version).toBe(CURRENT_VERSION);
    expect(migrate(null).version).toBe(CURRENT_VERSION);
    expect(migrate('garbage').version).toBe(CURRENT_VERSION);
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

describe('migrate onto preps', () => {
  /** State exactly as a vault written before preps existed would hold it. */
  const legacy = {
    version: 1,
    sessions: [
      {
        id: 'a',
        studyDay: '2026-08-27',
        startedAt: '2026-08-27T18:30:00.000Z',
        activeSeconds: 2700,
        section: 'QA',
      },
    ],
    notes: [{ id: 'n', studyDay: '2026-08-27', createdAt: 'x', section: 'QA', body: 'keep' }],
    lastPage: { 'QA/x.pdf': 12 },
  };

  it('seeds the prep that the whole vault used to be', () => {
    const state = migrate(legacy);

    expect(state.preps).toHaveLength(1);
    expect(state.preps[0]?.id).toBe(DEFAULT_PREP_ID);
    expect(state.preps[0]?.folder).toBe('');
    expect(state.activePrepId).toBe(DEFAULT_PREP_ID);
  });

  it('seeds nothing for a vault that was connected and never used', () => {
    // No records means nothing that needs a prep to belong to, and an empty
    // `preps` is what makes the app ask what the first one is for. Seeding here
    // is how every user used to end up inside a CAT countdown.
    for (const empty of [{}, { version: 1 }, { version: 1, sessions: [], notes: [] }]) {
      const state = migrate(empty);
      expect(state.preps).toEqual([]);
      expect(state.activePrepId).toBe('');
    }
  });

  it('still seeds when only one ledger has anything in it', () => {
    expect(migrate({ version: 1, mocks: [{ id: 'm' }] }).preps).toHaveLength(1);
  });

  it('backfills every old record onto that prep', () => {
    const state = migrate(legacy);

    expect(state.sessions[0]?.prepId).toBe(DEFAULT_PREP_ID);
    expect(state.notes[0]?.prepId).toBe(DEFAULT_PREP_ID);
    // Nothing else about the record is touched.
    expect(state.sessions[0]?.activeSeconds).toBe(2700);
    expect(state.notes[0]?.body).toBe('keep');
    expect(state.lastPage).toEqual({ 'QA/x.pdf': 12 });
  });

  it('leaves records that already name a prep alone', () => {
    const state = migrate({
      ...legacy,
      preps: [{ id: 'dbms', name: 'DBMS', folder: 'DBMS' }],
      sessions: [{ ...legacy.sessions[0], prepId: 'dbms' }],
    });

    expect(state.sessions[0]?.prepId).toBe('dbms');
  });

  it('keeps preps that are already there rather than re-seeding', () => {
    const preps = [
      { id: 'cat', name: 'CAT', folder: '' },
      { id: 'dbms', name: 'DBMS', folder: 'DBMS' },
    ];
    const state = migrate({ ...legacy, preps, activePrepId: 'dbms' });

    expect(state.preps).toEqual(preps);
    expect(state.activePrepId).toBe('dbms');
    // Untagged records belong to the first prep, not to whichever was active.
    expect(state.sessions[0]?.prepId).toBe('cat');
  });

  it('falls back to a real prep when the active id is stale', () => {
    const state = migrate({ ...legacy, preps: [{ id: 'cat', name: 'CAT', folder: '' }] });
    expect(state.activePrepId).toBe('cat');

    const gone = migrate({
      ...legacy,
      preps: [{ id: 'cat', name: 'CAT', folder: '' }],
      activePrepId: 'deleted',
    });
    expect(gone.activePrepId).toBe('cat');
  });

  it('discards malformed preps instead of trusting them', () => {
    const state = migrate({
      ...legacy,
      preps: [{ id: 'ok', name: 'Fine', folder: '' }, { name: 'no id' }, null, 'prep'],
    });

    expect(state.preps).toHaveLength(1);
    expect(state.preps[0]?.id).toBe('ok');
  });

  it('is idempotent', () => {
    const once = migrate(legacy);
    expect(migrate(once)).toEqual(once);
  });
});
