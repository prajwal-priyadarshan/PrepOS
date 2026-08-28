import { describe, expect, it } from 'vitest';
import {
  activeSeconds,
  advance,
  createClock,
  formatDuration,
  hasHitCap,
  IDLE_MS,
  isCounting,
  isIdle,
  MAX_SESSION_MS,
  onActivity,
  onVisibility,
} from '../src/lib/sessionClock';

const T0 = 1_800_000_000_000;
const sec = (n: number) => n * 1000;
const min = (n: number) => n * 60_000;

describe('sessionClock', () => {
  it('counts straightforward active time', () => {
    let c = createClock(T0);
    c = onActivity(c, T0 + sec(30));
    c = advance(c, T0 + sec(60));
    expect(activeSeconds(c)).toBe(60);
  });

  it('stops counting once idle, and does not backdate the idle period', () => {
    let c = createClock(T0);
    // No activity at all; advance well past the threshold.
    c = advance(c, T0 + min(10));
    // Credited exactly up to when idleness began, not the full ten minutes.
    expect(c.activeMs).toBe(IDLE_MS);
  });

  it('resumes counting on activity after going idle', () => {
    let c = createClock(T0);
    c = advance(c, T0 + min(10)); // 90s credited, then idle
    expect(c.activeMs).toBe(IDLE_MS);

    c = onActivity(c, T0 + min(10)); // user comes back
    c = advance(c, T0 + min(10) + sec(30));
    expect(c.activeMs).toBe(IDLE_MS + sec(30));
  });

  it('the M3 acceptance test: two minutes tabbed away adds nothing', () => {
    let c = createClock(T0);
    c = onActivity(c, T0 + sec(60)); // a minute of real reading
    c = onVisibility(c, true, T0 + sec(60)); // tab away

    c = advance(c, T0 + sec(60) + min(2)); // two minutes elsewhere
    expect(activeSeconds(c)).toBe(60);

    c = onVisibility(c, false, T0 + sec(60) + min(2)); // come back
    c = advance(c, T0 + sec(60) + min(2) + sec(30));
    expect(activeSeconds(c)).toBe(90); // 60 + 30, not 60 + 120 + 30
  });

  it('does not count while hidden even if activity fired just before', () => {
    let c = createClock(T0);
    c = onVisibility(c, true, T0);
    c = advance(c, T0 + min(30));
    expect(c.activeMs).toBe(0);
  });

  it('treats returning to the window as activity', () => {
    let c = createClock(T0);
    c = onVisibility(c, true, T0);
    c = onVisibility(c, false, T0 + min(60));
    // Fresh activity stamp, so the next stretch counts in full.
    c = advance(c, T0 + min(60) + sec(45));
    expect(activeSeconds(c)).toBe(45);
  });

  it('never counts time twice when advanced repeatedly', () => {
    let c = createClock(T0);
    c = onActivity(c, T0 + sec(10));
    c = advance(c, T0 + sec(20));
    const once = c.activeMs;
    c = advance(c, T0 + sec(20));
    c = advance(c, T0 + sec(20));
    expect(c.activeMs).toBe(once);
  });

  it('ignores a clock that goes backwards', () => {
    let c = createClock(T0);
    c = advance(c, T0 + sec(30));
    const before = c.activeMs;
    c = advance(c, T0 - min(5));
    expect(c.activeMs).toBe(before);
  });

  it('reports idle and counting states', () => {
    let c = createClock(T0);
    expect(isIdle(c, T0 + IDLE_MS - 1)).toBe(false);
    expect(isIdle(c, T0 + IDLE_MS)).toBe(true);
    expect(isCounting(c, T0 + IDLE_MS)).toBe(false);

    c = onVisibility(c, true, T0);
    expect(isIdle(c, T0)).toBe(false); // hidden is not idle
    expect(isCounting(c, T0)).toBe(false);
  });

  it('flags the three-hour cap', () => {
    let c = createClock(T0);
    for (let i = 1; i <= 200; i++) c = onActivity(c, T0 + min(i));
    expect(c.activeMs).toBe(min(200));
    expect(hasHitCap(c)).toBe(true);
    expect(MAX_SESSION_MS).toBe(min(180));
  });
});

describe('formatDuration', () => {
  it('uses padded, comparable digits', () => {
    expect(formatDuration(0)).toBe('0m 00s');
    expect(formatDuration(sec(9))).toBe('0m 09s');
    expect(formatDuration(min(12) + sec(30))).toBe('12m 30s');
    expect(formatDuration(min(64))).toBe('1h 04m');
    expect(formatDuration(min(180))).toBe('3h 00m');
  });

  it('does not render negatives', () => {
    expect(formatDuration(-5000)).toBe('0m 00s');
  });
});
