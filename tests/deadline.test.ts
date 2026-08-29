import { describe, expect, it } from 'vitest';
import { countdown, daysToTarget } from '../src/lib/deadline';

/** Midday on 27 August 2026, well clear of the 4am study-day boundary. */
const NOW = new Date(2026, 7, 27, 12, 0, 0);

describe('daysToTarget', () => {
  it('counts forward to a date still ahead', () => {
    expect(daysToTarget('2026-09-03', NOW)).toBe(7);
  });

  it('is zero on the day itself', () => {
    expect(daysToTarget('2026-08-27', NOW)).toBe(0);
  });

  it('goes negative once the date is past', () => {
    expect(daysToTarget('2026-08-20', NOW)).toBe(-7);
  });

  it('still reads as the day you started at 1am', () => {
    const lateNight = new Date(2026, 7, 28, 1, 30, 0);
    expect(daysToTarget('2026-08-27', lateNight)).toBe(0);
  });
});

describe('countdown', () => {
  it('counts down in days, singular on the last one', () => {
    expect(countdown('2026-09-03', NOW)).toEqual({ days: 7, label: 'days left' });
    expect(countdown('2026-08-28', NOW)).toEqual({ days: 1, label: 'day left' });
  });

  it('carries no number on the day itself', () => {
    // '0 days left' is arithmetically true and reads as a bug.
    expect(countdown('2026-08-27', NOW)).toEqual({ days: null, label: 'today' });
  });

  it('reads a passed deadline as elapsed, never as a negative countdown', () => {
    expect(countdown('2026-08-26', NOW)).toEqual({ days: 1, label: 'day ago' });
    expect(countdown('2026-08-20', NOW)).toEqual({ days: 7, label: 'days ago' });
  });
});
