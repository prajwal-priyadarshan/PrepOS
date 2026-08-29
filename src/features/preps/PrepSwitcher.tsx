import { useState } from 'react';
import { countdown } from '@/lib/deadline';
import { PrepDialog } from './PrepDialog';
import { useActivePrep } from './usePreps';

/**
 * The two prep actions that live in the masthead's action row.
 *
 * Which prep is active is no longer chosen here: the Prep plans rows on the
 * dashboard are the switcher, so picking a prep and reading how it is going are
 * the same click rather than two. What is left is making a new prep, and the
 * one thing about the active prep the header should always answer - how long is
 * left of it.
 *
 * The countdown reads off the active prep rather than a hard-coded exam date: a
 * prep with no deadline offers to set one instead of showing a fake date, and a
 * prep whose date has passed says so rather than counting through negatives.
 */
export function PrepActions() {
  const active = useActivePrep();
  const [dialog, setDialog] = useState<'new' | 'edit' | null>(null);

  const remaining = active?.targetDate === undefined ? null : countdown(active.targetDate);

  return (
    <>
      <button
        type="button"
        onClick={() => setDialog('new')}
        title="New prep"
        className="text-[13.5px] text-muted transition-colors hover:text-accent"
      >
        + Prep
      </button>

      <button
        type="button"
        onClick={() => setDialog('edit')}
        disabled={active === null}
        title={
          remaining === null
            ? 'Give this prep a date to count down to'
            : (active?.targetDate ?? undefined)
        }
        className="whitespace-nowrap text-[13.5px] text-muted transition-colors hover:text-accent disabled:opacity-40"
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

      {dialog === 'new' && <PrepDialog onClose={() => setDialog(null)} />}
      {dialog === 'edit' && active !== null && (
        <PrepDialog prep={active} onClose={() => setDialog(null)} />
      )}
    </>
  );
}
