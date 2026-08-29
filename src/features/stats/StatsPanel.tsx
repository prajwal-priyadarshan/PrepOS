import { useMemo, useState } from 'react';
import { countdown } from '@/lib/deadline';
import { formatAccuracy, formatHours, type Summary, summarise } from '@/lib/stats';
import { studyDay } from '@/lib/studyDay';
import { useProgress } from '@/store/useProgress';
import { PrepDialog } from '../preps/PrepDialog';
import { useActivePrep, usePreps } from '../preps/usePreps';

/**
 * A figure and what it counts.
 *
 * The number carries the whole weight at 40px; the label underneath is a
 * 10px kicker, deliberately small enough that the row reads as four numbers
 * first and four words second.
 */
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
          'tabular m-0 text-[40px] font-semibold leading-none tracking-[-0.01em]',
          muted ? 'text-muted' : 'text-ink',
        ].join(' ')}
      >
        {value}
      </p>
      <p className="kicker mt-2">{label}</p>
    </div>
  );
}

interface PrepRowProps {
  name: string;
  active: boolean;
  targetDate?: string;
  summary: Summary;
  onSelect: () => void;
  onEdit: () => void;
}

/**
 * One prep, one line.
 *
 * The row is also the switcher - there is no separate control for choosing
 * which prep is active, because choosing one and reading how it is going are
 * the same intent.
 */
function PrepRow({ name, active, targetDate, summary, onSelect, onEdit }: PrepRowProps) {
  const remaining = targetDate === undefined ? null : countdown(targetDate);

  return (
    <div className="group grid grid-cols-1 items-center gap-x-5 gap-y-1 border-t border-divider py-3.5 sm:grid-cols-[1fr_auto]">
      <div className="min-w-0">
        <div className="flex items-baseline gap-2.5">
          <button
            type="button"
            onClick={onSelect}
            title={active ? undefined : `Make ${name} the active prep`}
            className="tabular truncate text-[15px] font-semibold transition-colors hover:text-accent"
          >
            {name}
          </button>
          {active && (
            <span className="shrink-0 rounded-sm bg-tint px-[7px] py-[3px] text-[10px] uppercase leading-none tracking-[0.1em] text-accent">
              Active
            </span>
          )}
          <button
            type="button"
            onClick={onEdit}
            title="Rename this prep or change its deadline"
            className="shrink-0 text-[12.5px] text-muted opacity-0 transition-opacity hover:text-accent focus-visible:opacity-100 group-hover:opacity-100"
          >
            Edit
          </button>
        </div>
        <div className="mt-1 text-[12.5px] text-muted">
          {remaining === null
            ? 'No deadline'
            : `${remaining.days !== null ? `${remaining.days} ` : ''}${remaining.label}`}
        </div>
      </div>

      <div className="tabular flex flex-wrap items-center gap-x-[22px] gap-y-1 self-center text-[12.5px] text-soft">
        <span>{formatHours(summary.activeSeconds)} active</span>
        <span>{summary.sessions} sessions</span>
        <span>{formatAccuracy(summary.accuracy)} accuracy</span>
      </div>
    </div>
  );
}

/**
 * The home page: the cumulative ledger, then every prep plan as its own line.
 *
 * The total is the honest answer to "am I showing up", because a fortnight on
 * interview prep is not a fortnight off. The per-prep rows are the honest
 * answer to "am I ready for this one", which the total quietly hides.
 */
export function StatsPanel() {
  const state = useProgress((s) => s.state);
  const active = useActivePrep();
  const preps = usePreps();
  const setActivePrep = useProgress((s) => s.setActivePrep);
  const today = studyDay(new Date());
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const { total, rows, activeSummary } = useMemo(() => {
    return {
      total: summarise(state, null, today),
      rows: preps.map((prep) => ({ prep, summary: summarise(state, prep.id, today) })),
      activeSummary: active === null ? null : summarise(state, active.id, today),
    };
  }, [state, preps, active, today]);

  const editingPrep = editing === null ? null : (preps.find((p) => p.id === editing) ?? null);

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h2 className="m-0 mb-[22px] text-[21px] font-semibold">Across every prep</h2>
        <div className="grid grid-cols-2 gap-y-6 min-[900px]:grid-cols-4">
          <Figure value={formatHours(total.activeSeconds)} label="Active" />
          <Figure value={String(total.sessions)} label="Sessions" />
          <Figure value={String(total.days)} label="Days" />
          <Figure
            value={formatAccuracy(total.accuracy)}
            label="Accuracy"
            muted={total.accuracy === null}
          />
        </div>
      </section>

      {rows.length > 0 && (
        <section>
          <span className="kicker">Prep plans</span>
          <div className="mt-3 border-b border-divider">
            {rows.map(({ prep, summary }) => (
              <PrepRow
                key={prep.id}
                name={prep.name}
                active={prep.id === active?.id}
                summary={summary}
                onSelect={() => setActivePrep(prep.id)}
                onEdit={() => setEditing(prep.id)}
                {...(prep.targetDate !== undefined ? { targetDate: prep.targetDate } : {})}
              />
            ))}
            <div className="border-t border-divider py-3.5">
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="text-[13.5px] text-accent transition-opacity hover:opacity-70"
              >
                + New prep
              </button>
            </div>
          </div>
        </section>
      )}

      {activeSummary !== null && activeSummary.sections.length > 0 && (
        <section>
          <span className="kicker">{active?.name} by section</span>
          <ul className="mt-3 border-b border-divider">
            {activeSummary.sections.map((row) => (
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
        </section>
      )}

      {editingPrep !== null && <PrepDialog prep={editingPrep} onClose={() => setEditing(null)} />}
      {creating && <PrepDialog onClose={() => setCreating(false)} />}
    </div>
  );
}
