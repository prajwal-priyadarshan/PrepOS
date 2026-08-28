import { describe, expect, it } from 'vitest';
import { createNote, DEFAULT_PREP_ID, emptyState } from '../src/lib/model';
import { deserialise, migrate, serialise } from '../src/lib/persist';

describe('createNote', () => {
  const at = new Date(2026, 7, 28, 22, 15, 0);

  it('stamps the study day and the absolute time from one instant', () => {
    const note = createNote({ prepId: DEFAULT_PREP_ID, body: 'ratio trick', section: 'QA', at });

    expect(note.studyDay).toBe('2026-08-28');
    expect(note.createdAt).toBe(at.toISOString());
    expect(note.id).not.toBe(
      createNote({ prepId: DEFAULT_PREP_ID, body: 'x', section: 'QA', at }).id,
    );
  });

  it('counts a note written after midnight toward the day it belongs to', () => {
    const lateNight = new Date(2026, 7, 29, 1, 30, 0);

    expect(
      createNote({ prepId: DEFAULT_PREP_ID, body: 'still today', section: 'QA', at: lateNight })
        .studyDay,
    ).toBe('2026-08-28');
  });

  it('trims the body', () => {
    expect(
      createNote({ prepId: DEFAULT_PREP_ID, body: '  spaced  \n', section: 'GENERAL', at }).body,
    ).toBe('spaced');
  });

  it('omits context rather than storing empty keys', () => {
    const bare = createNote({
      prepId: DEFAULT_PREP_ID,
      body: 'no file open',
      section: 'GENERAL',
      at,
    });

    expect('filePath' in bare).toBe(false);
    expect('page' in bare).toBe(false);
  });

  it('keeps the file and page a note was written against', () => {
    const note = createNote({
      prepId: DEFAULT_PREP_ID,
      body: 'para 3 is the trap',
      section: 'VARC',
      filePath: 'VARC/rc-set-2.pdf',
      page: 7,
      at,
    });

    expect(note.filePath).toBe('VARC/rc-set-2.pdf');
    expect(note.page).toBe(7);
  });
});

describe('notes in persisted state', () => {
  it('survives a write and read', () => {
    const state = {
      ...emptyState(),
      notes: [
        createNote({
          prepId: DEFAULT_PREP_ID,
          body: 'keep me',
          section: 'QA',
          at: new Date(2026, 7, 28, 9),
        }),
      ],
    };

    expect(deserialise(serialise(state))).toEqual(state);
  });

  it('defaults to empty for state written before notes existed', () => {
    expect(migrate({ version: 1, sessions: [] }).notes).toEqual([]);
  });

  it('ignores a malformed notes field instead of throwing', () => {
    expect(migrate({ version: 1, notes: 'nope' }).notes).toEqual([]);
  });
});
