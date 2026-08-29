import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PREP_ID,
  defaultPrep,
  emptyState,
  GENERAL_SECTION,
  isInPrep,
  isPrep,
  type Prep,
  relativeToPrep,
  sectionForPath,
} from '../src/lib/model';
import { activePrepOf, folderIsFree, folderSlug, prepById, prepName } from '../src/lib/preps';

const prep = (id: string, folder: string, name = id): Prep => ({ id, name, folder });

describe('relativeToPrep', () => {
  it('is the identity for a prep rooted at the vault', () => {
    expect(relativeToPrep('QA/set-3.pdf', '')).toBe('QA/set-3.pdf');
  });

  it('strips the prep folder', () => {
    expect(relativeToPrep('DBMS/Indexing/btree.pdf', 'DBMS')).toBe('Indexing/btree.pdf');
    expect(relativeToPrep('DBMS', 'DBMS')).toBe('');
  });

  it('leaves a path from another prep alone', () => {
    expect(relativeToPrep('CAT/QA/set-3.pdf', 'DBMS')).toBe('CAT/QA/set-3.pdf');
  });

  it('does not treat a shared name prefix as a match', () => {
    expect(relativeToPrep('DBMS-old/x.pdf', 'DBMS')).toBe('DBMS-old/x.pdf');
  });
});

describe('isInPrep', () => {
  it('puts everything in a prep rooted at the vault', () => {
    expect(isInPrep('anything/at/all.pdf', '')).toBe(true);
  });

  it('matches the folder and its descendants only', () => {
    expect(isInPrep('DBMS', 'DBMS')).toBe(true);
    expect(isInPrep('DBMS/Indexing/btree.pdf', 'DBMS')).toBe(true);
    expect(isInPrep('DBMS-old/x.pdf', 'DBMS')).toBe(false);
    expect(isInPrep('CAT/QA/set-3.pdf', 'DBMS')).toBe(false);
  });
});

describe('sectionForPath', () => {
  it('reads the top folder when the prep is the vault', () => {
    expect(sectionForPath('QA/set-3.pdf')).toBe('QA');
    expect(sectionForPath('VARC/rc/set-2.pdf')).toBe('VARC');
  });

  it('reads the first folder inside the prep', () => {
    expect(sectionForPath('DBMS/Indexing/btree.pdf', 'DBMS')).toBe('Indexing');
  });

  it('is GENERAL for a file loose in the prep folder', () => {
    expect(sectionForPath('loose.pdf')).toBe(GENERAL_SECTION);
    expect(sectionForPath('DBMS/loose.pdf', 'DBMS')).toBe(GENERAL_SECTION);
  });

  it('no longer forces unknown folders to GENERAL', () => {
    // The old union type collapsed anything but VARC/DILR/QA. Preps cannot.
    expect(sectionForPath('Transactions/acid.pdf')).toBe('Transactions');
  });
});

describe('folderSlug', () => {
  it('makes a Windows-safe folder from a name', () => {
    expect(folderSlug('DBMS endsem')).toBe('DBMS-endsem');
    expect(folderSlug('Amazon SDE: interview?')).toBe('Amazon-SDE-interview');
  });

  it('collapses and trims separators', () => {
    expect(folderSlug('  spaced   out  ')).toBe('spaced-out');
    expect(folderSlug('--edges--')).toBe('edges');
  });

  it('always yields something creatable', () => {
    expect(folderSlug('')).toBe('prep');
    expect(folderSlug('???')).toBe('prep');
  });
});

describe('folderIsFree', () => {
  const preps = [prep('a', 'CAT'), prep('b', 'DBMS')];

  it('rejects a folder another prep already claims', () => {
    expect(folderIsFree(preps, 'DBMS')).toBe(false);
    expect(folderIsFree(preps, 'dbms')).toBe(false);
  });

  it('accepts a free folder', () => {
    expect(folderIsFree(preps, 'Interview')).toBe(true);
  });

  it('lets a prep keep its own folder while being edited', () => {
    expect(folderIsFree(preps, 'DBMS', 'b')).toBe(true);
  });
});

/** What a set-up vault holds: one prep, active. */
function withDefaultPrep() {
  return { ...emptyState(), preps: [defaultPrep()], activePrepId: DEFAULT_PREP_ID };
}

describe('emptyState', () => {
  it('names no prep at all, so the app knows to ask for one', () => {
    const state = emptyState();
    expect(state.preps).toEqual([]);
    expect(state.activePrepId).toBe('');
    expect(activePrepOf(state)).toBeNull();
  });

  it('does not seed an exam nobody chose', () => {
    // The regression this guards: 'CAT 2027' with a hard-coded November date,
    // handed to every user of an app that is not a CAT app.
    expect(defaultPrep().targetDate).toBeUndefined();
  });
});

describe('activePrepOf', () => {
  it('finds the prep in force', () => {
    expect(activePrepOf(withDefaultPrep())?.id).toBe(DEFAULT_PREP_ID);
  });

  it('is null rather than wrong when the id is stale', () => {
    const state = { ...withDefaultPrep(), activePrepId: 'gone' };
    expect(activePrepOf(state)).toBeNull();
  });
});

describe('prepById / prepName', () => {
  it('names a known prep and labels an unknown one', () => {
    const state = withDefaultPrep();
    expect(prepById(state, DEFAULT_PREP_ID)?.name).toBe(defaultPrep().name);
    expect(prepName(state, DEFAULT_PREP_ID)).toBe(defaultPrep().name);
    expect(prepName(state, 'gone')).toBe('Unfiled');
  });
});

describe('isPrep', () => {
  it('accepts a real prep and rejects debris', () => {
    expect(isPrep({ id: 'a', name: 'A', folder: '' })).toBe(true);
    expect(isPrep({ id: '', name: 'A', folder: '' })).toBe(false);
    expect(isPrep({ name: 'A', folder: '' })).toBe(false);
    expect(isPrep(null)).toBe(false);
    expect(isPrep('prep')).toBe(false);
  });
});
