import { useMemo } from 'react';
import { heatmapWeeks } from '@/lib/heatmap';
import { formatHours } from '@/lib/stats';

/**
 * Level 0 is a hairline square - present, not absent - so a quiet stretch
 * reads as "no bar cleared" rather than as a hole in the grid. Levels above it
 * step through the accent's own opacity, the same device tokens.css already
 * uses for tint - one colour, four strengths, instead of a five-colour scale.
 */
const LEVEL_CLASSES = ['bg-divider', 'bg-accent/25', 'bg-accent/50', 'bg-accent/75', 'bg-accent'];

interface Props {
  /** studyDay -> activeSeconds, e.g. from secondsByDay(). */
  totals: ReadonlyMap<string, number>;
  today: string;
  weeks?: number;
}

/**
 * A year of showing up, at a glance - the same shape as a GitHub contribution
 * graph, because that shape is already legible to anyone who has seen one.
 *
 * Weeks run left to right, oldest first, each column Monday at the top. Cells
 * past today are transparent rather than coloured: the grid always fills out
 * to a full last row, and a blank cell there has to read as "not yet", not as
 * "missed".
 */
export function Heatmap({ totals, today, weeks = 18 }: Props) {
  const grid = useMemo(() => heatmapWeeks(totals, today, weeks), [totals, today, weeks]);

  return (
    <div>
      <span className="kicker">Study heatmap</span>
      <div className="mt-3 flex gap-[3px] overflow-x-auto pb-1">
        {grid.map((week) => (
          <div key={week[0]?.studyDay} className="flex flex-col gap-[3px]">
            {week.map((cell) => (
              <div
                key={cell.studyDay}
                title={
                  cell.future ? undefined : `${cell.studyDay} — ${formatHours(cell.activeSeconds)}`
                }
                className={[
                  'size-[11px] shrink-0 rounded-[2px]',
                  cell.future ? 'bg-transparent' : LEVEL_CLASSES[cell.level],
                ].join(' ')}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-muted">
        <span>Less</span>
        {LEVEL_CLASSES.map((cls) => (
          <span key={cls} className={['size-[11px] rounded-[2px]', cls].join(' ')} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
