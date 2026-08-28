import { daysBetween, studyDay } from './studyDay';

/** CAT 2027: the last Sunday of November 2027. Seeds the first prep, no more. */
export const EXAM_DAY = '2027-11-28';

/** Signed: negative once the date is past, which is how a stale prep reads. */
export function daysToTarget(targetDate: string, now: Date = new Date()): number {
  return daysBetween(studyDay(now), targetDate);
}
