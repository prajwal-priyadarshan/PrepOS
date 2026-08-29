import { QUALIFYING_SECONDS } from './streak';
import { daysBetween, shiftStudyDay, weekKey } from './studyDay';

/**
 * The calendar-heatmap grid: how a year of sessions turns into a picture.
 *
 * Bucketed against QUALIFYING_SECONDS rather than a fixed minute count, so the
 * heatmap and the streak agree on what a light day looks like versus a full
 * one - the same bar, read two ways.
 */

export interface HeatmapCell {
  studyDay: string;
  activeSeconds: number;
  /** 0 (nothing) through 4 (double the qualifying bar or more). */
  level: 0 | 1 | 2 | 3 | 4;
  /** Past the day this grid was built for - rendered blank, not "0 studied". */
  future: boolean;
}

export type HeatmapWeek = HeatmapCell[];

export function heatmapLevel(activeSeconds: number): HeatmapCell['level'] {
  if (activeSeconds <= 0) return 0;
  if (activeSeconds < QUALIFYING_SECONDS * 0.5) return 1;
  if (activeSeconds < QUALIFYING_SECONDS) return 2;
  if (activeSeconds < QUALIFYING_SECONDS * 2) return 3;
  return 4;
}

/**
 * `weeks` full Monday-Sunday rows ending in the week that contains `today`.
 *
 * Monday-start to match weekKey - the streak's freeze budget and the
 * heatmap's columns are the same week. Days after `today` inside the last row
 * come back marked `future` rather than omitted, so every row is seven cells
 * and the grid never jumps a column short.
 */
export function heatmapWeeks(
  totals: ReadonlyMap<string, number>,
  today: string,
  weeks = 18,
): HeatmapWeek[] {
  const currentMonday = weekKey(today);
  const firstMonday = shiftStudyDay(currentMonday, -7 * (weeks - 1));

  const out: HeatmapWeek[] = [];
  for (let w = 0; w < weeks; w++) {
    const monday = shiftStudyDay(firstMonday, w * 7);
    const cells: HeatmapCell[] = [];
    for (let d = 0; d < 7; d++) {
      const day = shiftStudyDay(monday, d);
      const future = daysBetween(today, day) > 0;
      const activeSeconds = future ? 0 : (totals.get(day) ?? 0);
      cells.push({ studyDay: day, activeSeconds, level: heatmapLevel(activeSeconds), future });
    }
    out.push(cells);
  }
  return out;
}
