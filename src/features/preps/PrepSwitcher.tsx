import { useState } from 'react';
import { countdown } from '@/lib/deadline';
import { PrepDialog } from './PrepDialog';
import { useActivePrep } from './usePreps';

interface Props {
  /** Where to go if the edit dialog deletes the prep you were inside. */
  onDeleted: () => void;
}

/**
 * The one prep action left in the workspace header: how long is left of the
 * prep you're inside.
 *
 * Sized and coloured to sit inline with the prep name in the masthead's
 * dateline rail, not as a nav-row button of its own - it reads as a fact
 * about the prep, alongside its name, rather than as one more action jammed
 * into the tab row underneath.
 *
 * Everything else - switching prep, starting a new one - lives on the
 * dashboard now (see Dashboard.tsx), because the workspace is scoped to one
 * prep on purpose: creating another one is not a thing you can reach for
 * without first stepping back to the screen every prep lives on. Deleting the
 * one you're inside is reachable from here too, via the edit dialog - but the
 * workspace it leaves behind belongs to a prep that no longer exists, so
 * onDeleted is how App.tsx gets told to step back to the dashboard.
 */
export function PrepActions({ onDeleted }: Props) {
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
        className="tabular whitespace-nowrap transition-colors hover:text-accent"
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

      {editing && (
        <PrepDialog prep={active} onClose={() => setEditing(false)} onDeleted={onDeleted} />
      )}
    </>
  );
}
