import { describe, expect, it } from 'vitest';
import { type AppState, createNote, emptyState, type StudySession } from '../src/lib/model';
import { formatAccuracy, formatHours, sessionsFor, summarise } from '../src/lib/stats';

const HOUR = 3600;

function session(
  fields: Partial<StudySession> & { prepId: string; studyDay: string },
): StudySession {
  return {
    id: `s-${fields.studyDay}-${fields.prepId}-${fields.section ?? 'x'}`,
    startedAt: `${fields.studyDay}T10:00:00.000Z`,
    activeSeconds: HOUR,
    section: 'QA',
    ...fields,
  };
}

/** Two preps, run on overlapping days, with one unscored session. */
function state(): AppState {
  const base = emptyState();
  return {
    ...base,
    preps: [
      { id: 'cat', name: 'CAT', folder: '' },
      { id: 'dbms', name: 'DBMS', folder: 'DBMS' },
    ],
    activePrepId: 'cat',
    sessions: [
      session({ prepId: 'cat', studyDay: '2026-08-26', section: 'QA', attempted: 20, correct: 15 }),
      session({
        prepId: 'cat',
        studyDay: '2026-08-27',
        section: 'VARC',
        attempted: 10,
        correct: 5,
      }),
      session({
        prepId: 'dbms',
        studyDay: '2026-08-27',
        section: 'Indexing',
        activeSeconds: 1800,
        attempted: 4,
        correct: 4,
      }),
      // No attempted/correct: reading, not practice. Must not count as 0%.
      session({ prepId: 'dbms', studyDay: '2026-08-28', section: 'Indexing', activeSeconds: 900 }),
    ],
    notes: [
      createNote({ prepId: 'cat', body: 'a', section: 'QA', at: new Date(2026, 7, 27, 12) }),
      createNote({ prepId: 'dbms', body: 'b', section: 'Indexing', at: new Date(2026, 7, 27, 13) }),
    ],
  };
}

describe('sessionsFor', () => {
  it('filters by prep, and takes everything for null', () => {
    expect(sessionsFor(state(), 'cat')).toHaveLength(2);
    expect(sessionsFor(state(), 'dbms')).toHaveLength(2);
    expect(sessionsFor(state(), null)).toHaveLength(4);
  });
});

describe('summarise', () => {
  const today = '2026-08-28';

  it('totals every prep together', () => {
    const total = summarise(state(), null, today);
    expect(total.sessions).toBe(4);
    expect(total.activeSeconds).toBe(HOUR + HOUR + 1800 + 900);
    expect(total.attempted).toBe(34);
    expect(total.correct).toBe(24);
    expect(total.days).toBe(3);
    expect(total.notes).toBe(2);
    expect(total.lastStudied).toBe('2026-08-28');
  });

  it('scopes to one prep', () => {
    const cat = summarise(state(), 'cat', today);
    expect(cat.sessions).toBe(2);
    expect(cat.activeSeconds).toBe(2 * HOUR);
    expect(cat.attempted).toBe(30);
    expect(cat.notes).toBe(1);
    expect(cat.lastStudied).toBe('2026-08-27');
  });

  it('reports accuracy as null when nothing was attempted', () => {
    const idle = summarise(emptyState(), null, today);
    expect(idle.accuracy).toBeNull();
    expect(idle.sessions).toBe(0);
    expect(idle.lastStudied).toBeNull();
  });

  it('breaks a prep down by section, busiest first', () => {
    const dbms = summarise(state(), 'dbms', today);
    expect(dbms.sections.map((row) => row.section)).toEqual(['Indexing']);
    expect(dbms.sections[0]?.sessions).toBe(2);
    expect(dbms.sections[0]?.accuracy).toBe(1);

    const cat = summarise(state(), 'cat', today);
    expect(cat.sections.map((row) => row.section)).toEqual(['QA', 'VARC']);
  });

  it('counts a study day once however many preps ran on it', () => {
    // 27 August has both a CAT and a DBMS session; it is still one day shown up.
    expect(summarise(state(), null, today).days).toBe(3);
  });

  it('leaves today alone while it is still under the qualifying bar', () => {
    // 15 minutes logged today is not yet a qualifying day, but today in
    // progress must not break the run either.
    expect(summarise(state(), null, today).streak.current).toBe(2);
  });

  it('keeps the streak whole across a switch of prep', () => {
    const base = state();
    const worked = {
      ...base,
      sessions: base.sessions.map((s) =>
        s.studyDay === '2026-08-28' ? { ...s, activeSeconds: 1800 } : s,
      ),
    };

    // The reason the streak is computed on the combined set: three consecutive
    // days of work counts as three, even though CAT ran on only two of them and
    // a fortnight spent on interview prep would otherwise read as a fortnight off.
    expect(summarise(worked, null, today).streak.current).toBe(3);
    expect(summarise(worked, 'cat', today).streak.current).toBe(2);
  });
});

describe('formatHours', () => {
  it('reads in hours once there is an hour to read', () => {
    expect(formatHours(0)).toBe('0m');
    expect(formatHours(2880)).toBe('48m');
    expect(formatHours(HOUR)).toBe('1h 0m');
    expect(formatHours(45_600)).toBe('12h 40m');
  });
});

describe('formatAccuracy', () => {
  it('shows a dash rather than a misleading zero', () => {
    expect(formatAccuracy(null)).toBe('—');
    expect(formatAccuracy(0.75)).toBe('75%');
    expect(formatAccuracy(1)).toBe('100%');
  });
});
