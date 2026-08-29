import { daysBetween, studyDay } from './studyDay';

/**
 * How long is left of a prep.
 *
 * Nothing in here knows what the deadline is for. It used to be one exported
 * CAT date that the whole app counted down to; a prep now carries its own, and
 * a prep with nothing to count down to carries none.
 */

/** Signed: negative once the date is past, which is how a stale prep reads. */
export function daysToTarget(targetDate: string, now: Date = new Date()): number {
  return daysBetween(studyDay(now), targetDate);
}

/**
 * A countdown split in two so the number can keep tabular figures while the
 * words around it stay in the body face.
 *
 * `days` is null on the day itself, where the phrase carries no number at all:
 * '0 days left' is arithmetically true and reads like a bug.
 */
export interface Countdown {
  days: number | null;
  label: string;
}

export function countdown(targetDate: string, now: Date = new Date()): Countdown {
  const signed = daysToTarget(targetDate, now);
  if (signed === 0) return { days: null, label: 'today' };
  const days = Math.abs(signed);
  const noun = days === 1 ? 'day' : 'days';
  return { days, label: signed > 0 ? `${noun} left` : `${noun} ago` };
}
