import { daysBetween, studyDay } from './studyDay';

/** CAT 2027: the last Sunday of November 2027. */
export const EXAM_DAY = '2027-11-28';

export function daysToExam(now: Date = new Date()): number {
  return daysBetween(studyDay(now), EXAM_DAY);
}

export function weeksToExam(now: Date = new Date()): number {
  return daysToExam(now) / 7;
}
