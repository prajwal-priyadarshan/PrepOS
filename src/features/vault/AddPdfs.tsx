import { useState } from 'react';
import { dirLabel } from '@/lib/importPath';
import { useVault } from '@/store/useVault';
import { useActivePrep, usePrepDestinations } from '../preps/usePreps';

/**
 * Bringing new material in without leaving the app.
 *
 * The destination is picked from folders that already exist rather than typed:
 * the section a file lands in is what sectionForPath reads later, so a typo
 * here would quietly mis-file months of work.
 */
export function AddPdfs() {
  const importing = useVault((s) => s.importing);
  const importPdfs = useVault((s) => s.importPdfs);
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
    setLastAdded(await importPdfs(value));
  };

  return (
    <div className="border-t border-graphite/20 px-3 py-2">
      <label
        htmlFor="import-dest"
        className="block text-[11px] font-medium uppercase tracking-widest text-graphite"
      >
        Add PDFs {prep && <span className="normal-case tracking-normal">to {prep.name}</span>}
      </label>
      <select
        id="import-dest"
        value={value}
        onChange={(e) => setDest(e.target.value)}
        className="mt-1.5 w-full rounded border border-graphite/30 bg-surface px-2 py-1 text-xs"
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
        className="mt-1.5 w-full rounded border border-graphite/40 px-2 py-1.5 text-xs transition-colors hover:bg-graphite/10 disabled:opacity-40"
      >
        {importing ? 'Copying\u2026' : 'Choose PDFs\u2026'}
      </button>

      {lastAdded !== null && lastAdded > 0 && (
        <p className="mt-1.5 text-[11px] text-graphite">
          Added <span className="tabular text-ink">{lastAdded}</span>
          {lastAdded === 1 ? ' file' : ' files'} to{' '}
          <span className="tabular">{dirLabel(value)}</span>.
        </p>
      )}
    </div>
  );
}
