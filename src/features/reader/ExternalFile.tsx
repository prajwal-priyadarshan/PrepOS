import { useState } from 'react';
import { sectionForPath } from '@/lib/model';
import { useSession } from '@/store/useSession';
import { vault } from '@/vault';
import { useActivePrep } from '../preps/usePreps';

interface Props {
  filePath: string;
}

/**
 * Material the reader cannot render: slides, documents, spreadsheets.
 *
 * Handing it to PowerPoint is the easy half. The hard half is that our window
 * goes behind theirs, which the session clock would ordinarily read as away -
 * so this starts the session in external mode, where the visibility and idle
 * rules are suspended and it runs until ended by hand. That is a real trade:
 * an external session left running overnight credits three hours before the
 * cap stops it, which is why it is never started automatically.
 */
export function ExternalFile({ filePath }: Props) {
  const prep = useActivePrep();
  const runningFile = useSession((s) => s.filePath);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const running = runningFile === filePath;
  const name = filePath.split('/').at(-1);

  const open = async (withTimer: boolean) => {
    setBusy(true);
    setError(null);
    try {
      await vault.openExternally(filePath);
      if (withTimer) useSession.getState().start(filePath, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-md border border-graphite/20 bg-surface p-4">
      <h2 className="font-display text-sm font-semibold">Opens outside PrepOS</h2>
      <p className="tabular mt-2 break-all text-sm">{name}</p>
      <p className="mt-1 text-xs text-graphite">
        Section{' '}
        <span className="tabular text-ink">{sectionForPath(filePath, prep?.folder ?? '')}</span>
        <span> &middot; the reader handles PDFs only.</span>
      </p>

      {running ? (
        <p className="mt-3 rounded border-l-2 border-marker bg-marker/10 px-3 py-2 text-xs">
          Timing this now. It keeps counting while PrepOS is behind the other window, so end the
          session yourself when you stop.
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => open(true)}
            disabled={busy}
            className="rounded bg-ink px-3 py-1.5 text-xs font-medium text-paper disabled:opacity-40"
          >
            {busy ? 'Opening…' : 'Open and start timer'}
          </button>
          <button
            type="button"
            onClick={() => open(false)}
            disabled={busy}
            className="rounded border border-graphite/40 px-3 py-1.5 text-xs text-graphite transition-colors hover:bg-graphite/10 disabled:opacity-40"
          >
            Just open it
          </button>
        </div>
      )}

      {error !== null && (
        <p className="mt-3 rounded border-l-2 border-flag bg-flag/5 px-3 py-2 text-xs">{error}</p>
      )}
    </section>
  );
}
