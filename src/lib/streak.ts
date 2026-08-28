import { eachStudyDay, weekKey } from './studyDay';

/** A day counts as showing up at 25 active minutes. */
export const QUALIFYING_MINUTES = 25;
export const QUALIFYING_SECONDS = QUALIFYING_MINUTES * 60;

export interface DayContribution {
  studyDay: string;
  activeSeconds: number;
}

export interface StreakResult {
  /** Consecutive qualifying days, with freezes bridging gaps. */
  current: number;
  longest: number;
  /** Study days a freeze was spent on, oldest first. */
  freezesUsed: string[];
  qualifiedToday: boolean;
  /** Whether this week's freeze is still available. */
  freezeAvailableThisWeek: boolean;
}

export function secondsByDay(sessions: readonly DayContribution[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const s of sessions) {
    totals.set(s.studyDay, (totals.get(s.studyDay) ?? 0) + s.activeSeconds);
  }
  return totals;
}

/**
 * Streak with one freeze per calendar week.
 *
 * Without a freeze, one bad Tuesday in month four ends the habit. With it you
 * get a bad Tuesday and keep going. A frozen day bridges the run but does not
 * grow it - the number stays "days I actually showed up".
 *
 * Derived purely from session data so it cannot desync: AppState.streakFreezesUsed
 * is written from this result, never read back into it.
 */
export function computeStreak(sessions: readonly DayContribution[], today: string): StreakResult {
  const totals = secondsByDay(sessions);
  const qualifies = (day: string) => (totals.get(day) ?? 0) >= QUALIFYING_SECONDS;

  const recorded = [...totals.keys()].sort();
  const first = recorded[0];
  if (first === undefined) {
    return {
      current: 0,
      longest: 0,
      freezesUsed: [],
      qualifiedToday: false,
      freezeAvailableThisWeek: true,
    };
  }

  let run = 0;
  let longest = 0;
  const freezeSpentInWeek = new Set<string>();
  const freezesUsed: string[] = [];

  // Days recorded after `today` (seeded or clock-skewed) are ignored.
  for (const day of eachStudyDay(first, today)) {
    if (qualifies(day)) {
      run += 1;
      if (run > longest) longest = run;
      continue;
    }

    // Today is still in progress: it neither breaks the run nor burns a freeze.
    if (day === today) continue;

    const week = weekKey(day);
    if (run > 0 && !freezeSpentInWeek.has(week)) {
      freezeSpentInWeek.add(week);
      freezesUsed.push(day);
      continue;
    }

    run = 0;
  }

  return {
    current: run,
    longest,
    freezesUsed,
    qualifiedToday: qualifies(today),
    freezeAvailableThisWeek: !freezeSpentInWeek.has(weekKey(today)),
  };
}
