import { useEffect, useRef, useState } from 'react';
import { dirLabel } from '@/lib/importPath';
import { useVault } from '@/store/useVault';
import { useActivePrep, usePrepDestinations } from '../preps/usePreps';

interface Added {
  count: number;
  dest: string;
}

/**
 * Bringing new material in without leaving the app.
 *
 * A link that expands into a small form, not a form sitting permanently in
 * the sidebar - the same shape as NewFolder right above it. Importing is a
 * once-in-a-while action, not a fixture of the screen, so the resting state
 * is one line, not a bordered block with a label and a dropdown that are
 * almost never touched.
 *
 * PDFs open in the in-app reader; PPTs hand off to PowerPoint the moment
 * they're clicked (see ExternalFile) - both are welcome here, because a prep
 * folder that only takes one format is not where slides actually end up.
 *
 * The destination is picked from folders that already exist rather than typed:
 * the section a file lands in is what sectionForPath reads later, so a typo
 * here would quietly mis-file months of work.
 */
export function AddFiles() {
  const importing = useVault((s) => s.importing);
  const importFiles = useVault((s) => s.importFiles);
  const prep = useActivePrep();
  // Only folders inside the active prep: material for next month's endsem has
  // no business landing in another prep's tree because a stale option was
  // still selected when the prep was switched.
  const dirs = usePrepDestinations();

  const [open, setOpen] = useState(false);
  const [dest, setDest] = useState('');
  const [lastAdded, setLastAdded] = useState<Added | null>(null);
  const selectRef = useRef<HTMLSelectElement | null>(null);

  useEffect(() => {
    if (open) selectRef.current?.focus();
  }, [open]);

  // Falls back to the prep's own folder - the option that is always present -
  // when the chosen one is gone, or the prep was switched under it.
  const value = dirs.includes(dest) ? dest : (dirs[0] ?? '');

  const run = async () => {
    const count = await importFiles(value);
    // Cancelling the OS picker comes back as 0 too - leave the form open
    // rather than closing on what looks like nothing having happened.
    if (count > 0) {
      setLastAdded({ count, dest: value });
      setOpen(false);
    }
  };

  if (!open) {
    return (
      <div className="mt-auto flex flex-col gap-2 pt-6">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-left text-[13.5px] text-accent transition-opacity hover:opacity-70"
        >
          + Add PDFs or PPTs
        </button>
        {lastAdded !== null && (
          <p className="text-[12.5px] text-muted">
            Added <span className="tabular">{lastAdded.count}</span>
            {lastAdded.count === 1 ? ' file' : ' files'} to{' '}
            <span className="tabular">{dirLabel(lastAdded.dest, prep?.folder ?? '')}</span>.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-auto flex flex-col gap-2 pt-6">
      {/* One row, not the old label-then-box-then-button stack: the
          destination and the action that uses it belong on the same line,
          and there's nothing left worth a heading of its own. */}
      <div className="flex items-center gap-1.5">
        <select
          ref={selectRef}
          value={value}
          onChange={(e) => setDest(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
          }}
          aria-label={`Add PDFs or PPTs to ${prep?.name ?? 'this prep'}`}
          className="tabular min-w-0 flex-1 cursor-pointer rounded-sm border border-divider bg-surface px-2 py-1.5 text-[12.5px]"
        >
          {dirs.map((dir) => (
            <option key={dir} value={dir}>
              {dirLabel(dir, prep?.folder ?? '')}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={run}
          disabled={importing}
          className="shrink-0 rounded-sm bg-accent px-2.5 py-1.5 text-[12.5px] text-on-accent transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {importing ? 'Copying…' : 'Add'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={importing}
          title="Cancel"
          aria-label="Cancel"
          className="shrink-0 px-1 text-muted transition-colors hover:text-accent disabled:opacity-40"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
