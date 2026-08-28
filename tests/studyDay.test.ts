import { describe, expect, it } from 'vitest';
import {
  daysBetween,
  eachStudyDay,
  parseStudyDay,
  shiftStudyDay,
  studyDay,
  weekKey,
} from '../src/lib/studyDay';

// Local time throughout - the boundary is about when the user perceives the day
// to have ended, which is a wall-clock question, not a UTC one.
const at = (y: number, m: number, d: number, h: number, min: number) =>
  new Date(y, m - 1, d, h, min, 0, 0);

describe('studyDay - the 4am boundary', () => {
  it('keeps late-night work on the day it started', () => {
    expect(studyDay(at(2026, 8, 27, 23, 59))).toBe('2026-08-27');
    expect(studyDay(at(2026, 8, 28, 0, 1))).toBe('2026-08-27');
    expect(studyDay(at(2026, 8, 28, 3, 59))).toBe('2026-08-27');
  });

  it('rolls over at 4am exactly', () => {
    expect(studyDay(at(2026, 8, 28, 4, 0))).toBe('2026-08-28');
    expect(studyDay(at(2026, 8, 28, 4, 1))).toBe('2026-08-28');
  });

  it('treats a session spanning midnight as one day', () => {
    const start = studyDay(at(2026, 8, 27, 23, 40));
    const end = studyDay(at(2026, 8, 28, 0, 20));
    expect(start).toBe(end);
  });

  it('handles ordinary daytime hours unchanged', () => {
    expect(studyDay(at(2026, 8, 27, 12, 0))).toBe('2026-08-27');
    expect(studyDay(at(2026, 1, 1, 9, 30))).toBe('2026-01-01');
  });
});

describe('study day arithmetic', () => {
  it('round-trips through parse and format', () => {
    expect(studyDay(parseStudyDay('2026-08-27'))).toBe('2026-08-27');
  });

  it('shifts across month and year ends', () => {
    expect(shiftStudyDay('2026-08-31', 1)).toBe('2026-09-01');
    expect(shiftStudyDay('2026-01-01', -1)).toBe('2025-12-31');
    expect(shiftStudyDay('2027-11-28', 0)).toBe('2027-11-28');
  });

  it('counts days between, signed', () => {
    expect(daysBetween('2026-08-27', '2026-08-30')).toBe(3);
    expect(daysBetween('2026-08-30', '2026-08-27')).toBe(-3);
    expect(daysBetween('2026-08-27', '2026-08-27')).toBe(0);
  });

  it('enumerates inclusively and returns [] for reversed ranges', () => {
    expect(eachStudyDay('2026-08-27', '2026-08-29')).toEqual([
      '2026-08-27',
      '2026-08-28',
      '2026-08-29',
    ]);
    expect(eachStudyDay('2026-08-27', '2026-08-27')).toEqual(['2026-08-27']);
    expect(eachStudyDay('2026-08-29', '2026-08-27')).toEqual([]);
  });

  it('spans the full run to CAT 2027 without drifting', () => {
    const all = eachStudyDay('2026-08-27', '2027-11-28');
    expect(all).toHaveLength(daysBetween('2026-08-27', '2027-11-28') + 1);
    expect(all.at(-1)).toBe('2027-11-28');
  });

  it('groups a week onto its Monday', () => {
    // Mon 24th through Sun 30th August 2026 are one week.
    expect(weekKey('2026-08-24')).toBe('2026-08-24');
    expect(weekKey('2026-08-27')).toBe('2026-08-24');
    expect(weekKey('2026-08-30')).toBe('2026-08-24');
    expect(weekKey('2026-08-31')).toBe('2026-08-31');
  });
});
