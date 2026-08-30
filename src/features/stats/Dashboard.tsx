import { useMemo, useState } from 'react';
import { countdown } from '@/lib/deadline';
import type { Prep } from '@/lib/model';
import { formatHours, type Summary, sessionsFor, summarise } from '@/lib/stats';
import { secondsByDay } from '@/lib/streak';
import { studyDay } from '@/lib/studyDay';
import { useProgress } from '@/store/useProgress';
import { useVault } from '@/store/useVault';
import { PrepDialog } from '../preps/PrepDialog';
import { useActivePrep, usePreps } from '../preps/usePreps';
import { Heatmap } from './Heatmap';

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
  prep: Prep;
  lastOpened: boolean;
  summary: Summary;
  onStudy: () => void;
  onEdit: () => void;
}

/**
 * One prep, one line, and the row is the way in.
 *
 * There is no separate "select" step: this dashboard is the only place a prep
 * can be entered from, so clicking through to it and starting today's sitting
 * are the same click.
 */
function PrepRow({ prep, lastOpened, summary, onStudy, onEdit }: PrepRowProps) {
  const remaining = prep.targetDate === undefined ? null : countdown(prep.targetDate);

  return (
    <div className="group grid grid-cols-1 items-center gap-x-5 gap-y-1 border-t border-divider py-3.5 sm:grid-cols-[1fr_auto]">
      <div className="min-w-0">
        <div className="flex items-baseline gap-2.5">
          <button
            type="button"
            onClick={onStudy}
            title={`Open ${prep.name} and start studying`}
            className="tabular truncate text-[15px] font-semibold transition-colors hover:text-accent"
          >
            {prep.name}
          </button>
          {lastOpened && (
            <span className="shrink-0 rounded-sm bg-tint px-[7px] py-[3px] text-[10px] uppercase leading-none tracking-[0.1em] text-accent">
              Last opened
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
      </div>
    </div>
  );
}

interface Props {
  /** Enter a prep's own workspace - sets it active and switches the page. */
  onEnterPrep: (prep: Prep) => void;
}

/**
 * The home page: every prep plan, the cumulative ledger, and the heatmap -
 * nothing that belongs to one prep alone.
 *
 * The total is the honest answer to "am I showing up", because a fortnight on
 * interview prep is not a fortnight off. The per-prep rows are the honest
 * answer to "am I ready for this one", which the total quietly hides. Once a
 * prep is entered, this screen is left behind entirely - see App.tsx - so a
 * new plan can only ever be started from here.
 */
export function Dashboard({ onEnterPrep }: Props) {
  const state = useProgress((s) => s.state);
  const active = useActivePrep();
  const preps = usePreps();
  const root = useVault((s) => s.root);
  const disconnect = useVault((s) => s.disconnect);
  const today = studyDay(new Date());
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const { total, rows, dailyTotals } = useMemo(() => {
    return {
      total: summarise(state, null, today),
      rows: preps.map((prep) => ({ prep, summary: summarise(state, prep.id, today) })),
      dailyTotals: secondsByDay(sessionsFor(state, null)),
    };
  }, [state, preps, today]);

  const editingPrep = editing === null ? null : (preps.find((p) => p.id === editing) ?? null);

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h2 className="m-0 mb-[22px] text-[21px] font-semibold">Across every prep</h2>
        <div className="grid grid-cols-2 gap-y-6 sm:grid-cols-4">
          <Figure value={formatHours(dailyTotals.get(today) ?? 0)} label="Today" />
          <Figure value={formatHours(total.activeSeconds)} label="Active total" muted />
          <Figure value={String(total.sessions)} label="Sessions" muted />
          <Figure value={String(total.days)} label="Days" muted />
        </div>
      </section>

      <section>
        <Heatmap totals={dailyTotals} today={today} />
      </section>

      <section>
        <span className="kicker">Prep plans</span>
        <div className="mt-3 border-b border-divider">
          {rows.map(({ prep, summary }) => (
            <PrepRow
              key={prep.id}
              prep={prep}
              lastOpened={prep.id === active?.id}
              summary={summary}
              onStudy={() => onEnterPrep(prep)}
              onEdit={() => setEditing(prep.id)}
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

      <section>
        <h3 className="m-0 mb-1.5 text-lg font-semibold">Vault</h3>
        <p className="tabular m-0 break-all text-xs text-muted">{root}</p>
        <button
          type="button"
          onClick={disconnect}
          className="mt-3 rounded-sm border border-divider px-[15px] py-2 text-[13.5px] transition-colors hover:bg-tint"
        >
          Forget this vault
        </button>
      </section>

      {editingPrep !== null && <PrepDialog prep={editingPrep} onClose={() => setEditing(null)} />}
      {creating && <PrepDialog onClose={() => setCreating(false)} />}
    </div>
  );
}
