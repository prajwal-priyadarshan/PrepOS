import type { AppState, Section, StudySession } from './model';
import { computeStreak, type StreakResult } from './streak';

/**
 * Reading the ledger back.
 *
 * Everything here is derived on demand from sessions and notes. Nothing is
 * stored, so a total can never drift from the records it claims to summarise -
 * the same reason streakFreezesUsed is written from computeStreak and never
 * read back into it.
 */

export interface SectionRow {
  section: Section;
  sessions: number;
  activeSeconds: number;
  attempted: number;
  correct: number;
  /** null when nothing was attempted - not 0%, which would read as failure. */
  accuracy: number | null;
}

export interface Summary {
  /** null when this is every prep combined. */
  prepId: string | null;
  sessions: number;
  activeSeconds: number;
  attempted: number;
  correct: number;
  accuracy: number | null;
  notes: number;
  /** Distinct study days with at least one session. */
  days: number;
  lastStudied: string | null;
  streak: StreakResult;
  /** Busiest section first. */
  sections: SectionRow[];
}

export function sessionsFor(state: AppState, prepId: string | null): StudySession[] {
  return prepId === null ? state.sessions : state.sessions.filter((s) => s.prepId === prepId);
}

function ratio(correct: number, attempted: number): number | null {
  return attempted > 0 ? correct / attempted : null;
}

export function summarise(state: AppState, prepId: string | null, today: string): Summary {
  const sessions = sessionsFor(state, prepId);
  const notes = prepId === null ? state.notes : state.notes.filter((n) => n.prepId === prepId);

  let activeSeconds = 0;
  let attempted = 0;
  let correct = 0;
  const days = new Set<string>();
  const bySection = new Map<Section, SectionRow>();

  for (const session of sessions) {
    activeSeconds += session.activeSeconds;
    attempted += session.attempted ?? 0;
    correct += session.correct ?? 0;
    days.add(session.studyDay);

    const row = bySection.get(session.section) ?? {
      section: session.section,
      sessions: 0,
      activeSeconds: 0,
      attempted: 0,
      correct: 0,
      accuracy: null,
    };
    row.sessions += 1;
    row.activeSeconds += session.activeSeconds;
    row.attempted += session.attempted ?? 0;
    row.correct += session.correct ?? 0;
    bySection.set(session.section, row);
  }

  for (const row of bySection.values()) row.accuracy = ratio(row.correct, row.attempted);

  const sorted = [...days].sort();

  return {
    prepId,
    sessions: sessions.length,
    activeSeconds,
    attempted,
    correct,
    accuracy: ratio(correct, attempted),
    notes: notes.length,
    days: days.size,
    lastStudied: sorted.at(-1) ?? null,
    streak: computeStreak(sessions, today),
    sections: [...bySection.values()].sort((a, b) => b.activeSeconds - a.activeSeconds),
  };
}

/** '12h 40m', or '48m' below an hour. Hours are the unit that means anything. */
export function formatHours(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h === 0 ? `${m}m` : `${h}h ${m}m`;
}

export function formatAccuracy(accuracy: number | null): string {
  return accuracy === null ? '-' : `${Math.round(accuracy * 100)}%`;
}
