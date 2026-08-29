import { useState } from 'react';
import { countdown } from '@/lib/deadline';
import { PrepDialog } from './PrepDialog';
import { useActivePrep } from './usePreps';

/**
 * The one prep action left in the workspace header: how long is left of the
 * prep you're inside.
 *
 * Everything else - switching prep, starting a new one - lives on the
 * dashboard now (see Dashboard.tsx), because the workspace is scoped to one
 * prep on purpose: creating another one is not a thing you can reach for
 * without first stepping back to the screen every prep lives on.
 */
export function PrepActions() {
  const active = useActivePrep();
  const [editing, setEditing] = useState(false);

  const remaining = active?.targetDate === undefined ? null : countdown(active.targetDate);

  if (active === null) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setEditing(true)}
        title={remaining === null ? 'Give this prep a date to count down to' : active.targetDate}
        className="whitespace-nowrap text-[13.5px] text-muted transition-colors hover:text-accent"
      >
        {remaining === null ? (
          'Set a deadline'
        ) : (
          <>
            {remaining.days !== null && <span className="tabular text-ink">{remaining.days} </span>}
            {remaining.label}
          </>
        )}
      </button>

      {editing && <PrepDialog prep={active} onClose={() => setEditing(false)} />}
    </>
  );
}
