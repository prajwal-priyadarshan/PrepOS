import { useState } from 'react';
import { dirLabel, flattenDirs } from '@/lib/importPath';
import { useVault } from '@/store/useVault';

/**
 * Bringing new material in without leaving the app.
 *
 * The destination is picked from folders that already exist rather than typed:
 * the section a file lands in is what sectionForPath reads later, so a typo
 * here would quietly mis-file months of work.
 */
export function AddPdfs() {
  const tree = useVault((s) => s.tree);
  const importing = useVault((s) => s.importing);
  const importPdfs = useVault((s) => s.importPdfs);

  const dirs = flattenDirs(tree);
  const [dest, setDest] = useState('');
  const [lastAdded, setLastAdded] = useState<number | null>(null);

  // A folder can vanish between renders - deleted outside the app, or a refresh.
  const value = dirs.includes(dest) ? dest : '';

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
        Add PDFs
      </label>
      <select
        id="import-dest"
        value={value}
        onChange={(e) => setDest(e.target.value)}
        className="mt-1.5 w-full rounded border border-graphite/30 bg-surface px-2 py-1 text-xs"
      >
        {dirs.map((dir) => (
          <option key={dir} value={dir}>
            {dirLabel(dir)}
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
