import { describe, expect, it } from 'vitest';
import { computeStreak, type DayContribution, QUALIFYING_SECONDS } from '../src/lib/streak';

/** Mon 2026-08-24 .. Sun 2026-08-30 is one calendar week; 08-31 starts the next. */
const day = (studyDay: string, minutes: number): DayContribution => ({
  studyDay,
  activeSeconds: minutes * 60,
});
const full = (d: string) => day(d, 30);

describe('computeStreak', () => {
  it('is zero with no sessions at all', () => {
    const r = computeStreak([], '2026-08-27');
    expect(r).toEqual({
      current: 0,
      longest: 0,
      freezesUsed: [],
      qualifiedToday: false,
      freezeAvailableThisWeek: true,
    });
  });

  it('counts a single day', () => {
    const r = computeStreak([full('2026-08-27')], '2026-08-27');
    expect(r.current).toBe(1);
    expect(r.longest).toBe(1);
    expect(r.qualifiedToday).toBe(true);
  });

  it('needs 25 active minutes to count the day', () => {
    expect(computeStreak([day('2026-08-27', 24)], '2026-08-27').current).toBe(0);
    expect(computeStreak([day('2026-08-27', 25)], '2026-08-27').current).toBe(1);
  });

  it('sums several sittings within one day toward the threshold', () => {
    const r = computeStreak([day('2026-08-27', 15), day('2026-08-27', 12)], '2026-08-27');
    expect(r.current).toBe(1);
  });

  it('counts consecutive days', () => {
    const r = computeStreak(
      [full('2026-08-25'), full('2026-08-26'), full('2026-08-27')],
      '2026-08-27',
    );
    expect(r.current).toBe(3);
    expect(r.longest).toBe(3);
  });

  it("bridges one missed day with that week's freeze", () => {
    // Mon qualifies, Tue missed, Wed qualifies.
    const r = computeStreak([full('2026-08-24'), full('2026-08-26')], '2026-08-26');
    expect(r.current).toBe(2);
    expect(r.freezesUsed).toEqual(['2026-08-25']);
    expect(r.freezeAvailableThisWeek).toBe(false);
  });

  it('breaks on a second miss in the same week', () => {
    // Mon ok, Tue + Wed missed (only one freeze available), Thu ok.
    const r = computeStreak([full('2026-08-24'), full('2026-08-27')], '2026-08-27');
    expect(r.current).toBe(1);
    expect(r.longest).toBe(1);
    expect(r.freezesUsed).toEqual(['2026-08-25']);
  });

  it('grants a fresh freeze in the following week', () => {
    const sessions = [
      full('2026-08-27'), // Thu, week of 08-24
      // Fri 08-28 missed -> freeze (week of 08-24)
      full('2026-08-29'),
      full('2026-08-30'),
      full('2026-08-31'), // Mon, week of 08-31
      // Tue 09-01 missed -> freeze (week of 08-31)
      full('2026-09-02'),
    ];
    const r = computeStreak(sessions, '2026-09-02');
    expect(r.current).toBe(5);
    expect(r.freezesUsed).toEqual(['2026-08-28', '2026-09-01']);
  });

  it('does not break the streak just because today is not done yet', () => {
    const r = computeStreak([full('2026-08-25'), full('2026-08-26')], '2026-08-27');
    expect(r.current).toBe(2);
    expect(r.qualifiedToday).toBe(false);
    // Today must not burn the freeze - the day is still in progress.
    expect(r.freezeAvailableThisWeek).toBe(true);
    expect(r.freezesUsed).toEqual([]);
  });

  it('does not spend a freeze when there is no streak to protect', () => {
    // A gap before any qualifying day should not consume the week's freeze.
    const r = computeStreak([day('2026-08-24', 5), full('2026-08-26')], '2026-08-26');
    expect(r.current).toBe(1);
    expect(r.freezesUsed).toEqual([]);
    expect(r.freezeAvailableThisWeek).toBe(true);
  });

  it('remembers the longest run after a break', () => {
    const sessions = [
      full('2026-08-03'),
      full('2026-08-04'),
      full('2026-08-05'),
      full('2026-08-06'),
      // 08-07 and 08-08 both missed -> one freeze, then break
      full('2026-08-20'),
    ];
    const r = computeStreak(sessions, '2026-08-20');
    expect(r.longest).toBe(4);
    expect(r.current).toBe(1);
  });

  it('ignores days recorded after today', () => {
    const r = computeStreak([full('2026-08-27'), full('2026-09-15')], '2026-08-27');
    expect(r.current).toBe(1);
  });

  it('exposes the threshold it used', () => {
    expect(QUALIFYING_SECONDS).toBe(1500);
  });
});
