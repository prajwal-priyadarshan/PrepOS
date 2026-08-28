import { useMemo } from 'react';
import { formatAccuracy, formatHours, summarise } from '@/lib/stats';
import { studyDay } from '@/lib/studyDay';
import { useProgress } from '@/store/useProgress';
import { useActivePrep } from '../preps/usePreps';

function Figure({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="tabular font-display text-xl font-semibold leading-none">{value}</p>
      <p className="mt-1 text-[11px] uppercase tracking-widest text-graphite">{label}</p>
    </div>
  );
}

/**
 * Both readings of the same ledger.
 *
 * The total is the honest answer to "am I showing up", because a fortnight on
 * interview prep is not a fortnight off. The per-prep rows are the honest
 * answer to "am I ready for this one", which the total quietly hides.
 */
export function StatsPanel() {
  const state = useProgress((s) => s.state);
  const active = useActivePrep();
  const today = studyDay(new Date());

  const { total, rows, activeSummary } = useMemo(() => {
    return {
      total: summarise(state, null, today),
      rows: state.preps.map((prep) => ({ prep, summary: summarise(state, prep.id, today) })),
      activeSummary: active === null ? null : summarise(state, active.id, today),
    };
  }, [state, active, today]);

  return (
    <section className="rounded-md border border-graphite/20 bg-surface p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-sm font-semibold">Across every prep</h2>
        <span className="text-[11px] text-graphite">
          <span className="tabular text-ink">{total.streak.current}</span> day streak
          {total.streak.freezeAvailableThisWeek ? '' : ' \u00b7 freeze spent'}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-4">
        <Figure value={formatHours(total.activeSeconds)} label="Active" />
        <Figure value={String(total.sessions)} label="Sessions" />
        <Figure value={String(total.days)} label="Days" />
        <Figure value={formatAccuracy(total.accuracy)} label="Accuracy" />
      </div>

      {rows.length > 0 && (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] uppercase tracking-widest text-graphite">
              <tr>
                <th className="pb-1 font-medium">Prep</th>
                <th className="pb-1 text-right font-medium">Active</th>
                <th className="pb-1 text-right font-medium">Sessions</th>
                <th className="pb-1 text-right font-medium">Accuracy</th>
                <th className="pb-1 text-right font-medium">Last</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ prep, summary }) => (
                <tr key={prep.id} className={prep.id === active?.id ? 'text-ink' : 'text-graphite'}>
                  <td className="border-t border-graphite/15 py-1.5 pr-3">
                    {prep.id === active?.id && <span aria-hidden>&rsaquo; </span>}
                    {prep.name}
                  </td>
                  <td className="tabular border-t border-graphite/15 py-1.5 text-right">
                    {formatHours(summary.activeSeconds)}
                  </td>
                  <td className="tabular border-t border-graphite/15 py-1.5 text-right">
                    {summary.sessions}
                  </td>
                  <td className="tabular border-t border-graphite/15 py-1.5 text-right">
                    {formatAccuracy(summary.accuracy)}
                  </td>
                  <td className="tabular border-t border-graphite/15 py-1.5 text-right">
                    {summary.lastStudied ?? '\u2013'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeSummary !== null && activeSummary.sections.length > 0 && (
        <div className="mt-5">
          <h3 className="text-[11px] uppercase tracking-widest text-graphite">
            {active?.name} by section
          </h3>
          <ul className="mt-2 space-y-1">
            {activeSummary.sections.map((row) => (
              <li key={row.section} className="flex items-baseline justify-between gap-3 text-xs">
                <span>{row.section}</span>
                <span className="tabular text-graphite">
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
        </div>
      )}
    </section>
  );
}
