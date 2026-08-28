import { useState } from 'react';
import { daysToTarget } from '@/lib/exam';
import { useProgress } from '@/store/useProgress';
import { NewPrepDialog } from './NewPrepDialog';
import { useActivePrep, usePreps } from './usePreps';

/**
 * What you are preparing for, and how long is left of it.
 *
 * The countdown moved here from a hard-coded CAT constant: a prep with no
 * target date simply does not show one, which is the honest rendering of
 * open-ended prep rather than a fake deadline.
 */
export function PrepSwitcher() {
  const preps = usePreps();
  const active = useActivePrep();
  const activeId = useProgress((s) => s.state.activePrepId);
  const setActivePrep = useProgress((s) => s.setActivePrep);
  const [creating, setCreating] = useState(false);

  const remaining = active?.targetDate === undefined ? null : daysToTarget(active.targetDate);

  return (
    <>
      <div className="flex items-center gap-3">
        <select
          value={activeId}
          onChange={(e) => setActivePrep(e.target.value)}
          aria-label="Active prep"
          className="max-w-48 rounded border border-graphite/30 bg-surface px-2 py-1 text-xs"
        >
          {preps.map((prep) => (
            <option key={prep.id} value={prep.id}>
              {prep.name}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setCreating(true)}
          title="New prep"
          className="rounded px-1.5 py-1 text-xs text-graphite hover:bg-graphite/10"
        >
          + Prep
        </button>

        {remaining !== null && (
          <span className="whitespace-nowrap text-xs text-graphite">
            <span className="tabular text-ink">{remaining}</span>
            {remaining === 1 ? ' day to ' : ' days to '}
            {active?.name}
          </span>
        )}
      </div>

      {creating && <NewPrepDialog onClose={() => setCreating(false)} />}
    </>
  );
}
