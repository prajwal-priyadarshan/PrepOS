import { useMemo } from 'react';
import { formatAccuracy, formatHours, summarise } from '@/lib/stats';
import { studyDay } from '@/lib/studyDay';
import { useProgress } from '@/store/useProgress';
import { useActivePrep } from '../preps/usePreps';

/** Same figure as Dashboard's, sized down - this one shares a page with the
 *  file tree and the reader instead of owning the whole screen. */
function Figure({
  value,
  label,
  muted = false,
}: {
  value: string;
  label: string;
  muted?: boolean;
}) {
  return (
    <div>
      <p
        className={[
          'tabular m-0 text-[28px] font-semibold leading-none tracking-[-0.01em]',
          muted ? 'text-muted' : 'text-ink',
        ].join(' ')}
      >
        {value}
      </p>
      <p className="kicker mt-1.5">{label}</p>
    </div>
  );
}

/**
 * How this one prep is going - nothing about any other.
 *
 * Where Dashboard's stats are the honest answer to "am I showing up" across
 * everything, this is the honest answer to "am I ready for this one": the
 * same four figures, but only this prep's sessions ever reach summarise() here.
 */
export function PrepStats() {
  const state = useProgress((s) => s.state);
  const prep = useActivePrep();
  const today = studyDay(new Date());

  const summary = useMemo(
    () => (prep === null ? null : summarise(state, prep.id, today)),
    [state, prep, today],
  );

  if (prep === null || summary === null) return null;

  return (
    <section>
      <h2 className="m-0 mb-5 text-[21px] font-semibold">{prep.name}</h2>
      <div className="grid grid-cols-2 gap-y-5 min-[640px]:grid-cols-4">
        <Figure value={formatHours(summary.activeSeconds)} label="Active" />
        <Figure value={String(summary.sessions)} label="Sessions" />
        <Figure value={String(summary.days)} label="Days" />
        <Figure
          value={formatAccuracy(summary.accuracy)}
          label="Accuracy"
          muted={summary.accuracy === null}
        />
      </div>

      {summary.sections.length > 0 && (
        <ul className="mt-6 border-b border-divider">
          {summary.sections.map((row) => (
            <li
              key={row.section}
              className="flex items-baseline justify-between gap-4 border-t border-divider py-2.5 text-[13.5px]"
            >
              <span className="truncate">{row.section}</span>
              <span className="tabular shrink-0 text-[12.5px] text-muted">
                {formatHours(row.activeSeconds)}
                <span> &middot; </span>
                {row.sessions}
                {row.sessions === 1 ? ' session' : ' sessions'}
                <span> &middot; </span>
                {formatAccuracy(row.accuracy)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
