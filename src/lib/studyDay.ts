import { addDays, differenceInCalendarDays, format, startOfWeek, subHours } from 'date-fns';

/**
 * A study day runs 4am -> 4am, not midnight -> midnight.
 *
 * A session that starts at 11:40pm and ends at 12:20am is one sitting, not two,
 * and finishing at 1am counts toward the day you started. Deriving this at read
 * time instead of storing it is how a streak silently corrupts six months in -
 * every record stores both the absolute ISO timestamp and the derived studyDay.
 */
export const DAY_BOUNDARY_HOUR = 4;

/** Monday-start weeks. The freeze budget in streak.ts is per calendar week. */
export const WEEK_STARTS_ON = 1 as const;

export function studyDay(d: Date): string {
  return format(subHours(d, DAY_BOUNDARY_HOUR), 'yyyy-MM-dd');
}

/**
 * Parse a 'yyyy-MM-dd' study day to a local Date at midday.
 *
 * Midday, not midnight: it keeps every arithmetic operation below clear of DST
 * transitions, where a local midnight can fail to exist or happen twice.
 */
export function parseStudyDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  if (y === undefined || m === undefined || d === undefined) {
    throw new Error(`Not a study day: ${day}`);
  }
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function shiftStudyDay(day: string, delta: number): string {
  return format(addDays(parseStudyDay(day), delta), 'yyyy-MM-dd');
}

/** Signed day count: positive when `to` is later than `from`. */
export function daysBetween(from: string, to: string): number {
  return differenceInCalendarDays(parseStudyDay(to), parseStudyDay(from));
}

/** Inclusive at both ends. Returns [] when `to` precedes `from`. */
export function eachStudyDay(from: string, to: string): string[] {
  const span = daysBetween(from, to);
  if (span < 0) return [];
  const out: string[] = new Array(span + 1);
  for (let i = 0; i <= span; i++) out[i] = shiftStudyDay(from, i);
  return out;
}

/** Identifies the calendar week a study day falls in, as its Monday. */
export function weekKey(day: string): string {
  return format(startOfWeek(parseStudyDay(day), { weekStartsOn: WEEK_STARTS_ON }), 'yyyy-MM-dd');
}
