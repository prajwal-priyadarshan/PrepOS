import { describe, expect, it } from 'vitest';
import { heatmapLevel, heatmapWeeks } from '../src/lib/heatmap';
import { QUALIFYING_SECONDS } from '../src/lib/streak';

describe('heatmapLevel', () => {
  it('buckets against the qualifying bar', () => {
    expect(heatmapLevel(0)).toBe(0);
    expect(heatmapLevel(QUALIFYING_SECONDS * 0.25)).toBe(1);
    expect(heatmapLevel(QUALIFYING_SECONDS * 0.75)).toBe(2);
    expect(heatmapLevel(QUALIFYING_SECONDS * 1.5)).toBe(3);
    expect(heatmapLevel(QUALIFYING_SECONDS * 3)).toBe(4);
  });
});

describe('heatmapWeeks', () => {
  it('returns `weeks` rows of seven days each', () => {
    const grid = heatmapWeeks(new Map(), '2026-08-29', 18);
    expect(grid).toHaveLength(18);
    for (const week of grid) expect(week).toHaveLength(7);
  });

  it('rows run Monday to Sunday and end in the week containing today', () => {
    const grid = heatmapWeeks(new Map(), '2026-08-29', 4); // a Saturday
    const lastWeek = grid.at(-1);
    expect(lastWeek?.[0]?.studyDay).toBe('2026-08-24'); // Monday
    expect(lastWeek?.[6]?.studyDay).toBe('2026-08-30'); // Sunday
  });

  it('marks days after today as future rather than zero', () => {
    const grid = heatmapWeeks(new Map(), '2026-08-29', 1);
    const week = grid[0];
    expect(week?.find((c) => c.studyDay === '2026-08-29')?.future).toBe(false);
    expect(week?.find((c) => c.studyDay === '2026-08-30')?.future).toBe(true);
  });

  it('reads totals through to activeSeconds and level', () => {
    const totals = new Map([['2026-08-29', QUALIFYING_SECONDS * 2]]);
    const grid = heatmapWeeks(totals, '2026-08-29', 1);
    const cell = grid[0]?.find((c) => c.studyDay === '2026-08-29');
    expect(cell?.activeSeconds).toBe(QUALIFYING_SECONDS * 2);
    expect(cell?.level).toBe(4);
  });
});
