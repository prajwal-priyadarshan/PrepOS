import { useState } from 'react';
import { dirLabel } from '@/lib/importPath';
import { useVault } from '@/store/useVault';
import { useActivePrep, usePrepDestinations } from '../preps/usePreps';

/**
 * Bringing new material in without leaving the app.
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

  const [dest, setDest] = useState('');
  const [lastAdded, setLastAdded] = useState<number | null>(null);

  // Falls back to the prep's own folder - the option that is always present -
  // when the chosen one is gone, or the prep was switched under it.
  const value = dirs.includes(dest) ? dest : (dirs[0] ?? '');

  const run = async () => {
    setLastAdded(null);
    setLastAdded(await importFiles(value));
  };

  return (
    <div className="mt-auto flex flex-col gap-2.5 pt-6">
      <label htmlFor="import-dest" className="kicker">
        Add PDFs or PPTs{' '}
        {prep && <span className="normal-case tracking-normal">to {prep.name}</span>}
      </label>

      <select
        id="import-dest"
        value={value}
        onChange={(e) => setDest(e.target.value)}
        className="tabular w-full cursor-pointer rounded-sm border border-divider bg-surface px-2.5 py-1.5 text-[13px]"
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
        className="w-full rounded-sm border border-divider px-[15px] py-2 text-[13.5px] transition-colors hover:bg-tint disabled:opacity-40"
      >
        {importing ? 'Copying…' : 'Choose files…'}
      </button>

      {lastAdded !== null && lastAdded > 0 && (
        <p className="text-[12.5px] text-muted">
          Added <span className="tabular">{lastAdded}</span>
          {lastAdded === 1 ? ' file' : ' files'} to{' '}
          <span className="tabular">{dirLabel(value)}</span>.
        </p>
      )}
    </div>
  );
}
