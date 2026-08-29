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
    <section>
      <h3 className="tabular m-0 mb-2 break-all text-lg font-semibold">{name}</h3>
      <p className="m-0 max-w-[62ch] text-sm leading-[1.55] text-soft [text-wrap:pretty]">
        This one opens outside PrepOS &mdash; the reader handles PDFs only. Started with the timer,
        it keeps counting while PrepOS sits behind the other window, so you end that session
        yourself.
      </p>
      <p className="tabular m-0 mt-2 text-[12.5px] text-muted">
        section {sectionForPath(filePath, prep?.folder ?? '')}
      </p>

      {running ? (
        <p className="mt-4 border-l-2 border-accent px-3 py-2 text-[13.5px] text-soft">
          Timing this now. End the session yourself when you stop.
        </p>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => open(true)}
            disabled={busy}
            className="rounded-sm bg-accent px-[15px] py-2 text-[13.5px] text-on-accent transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {busy ? 'Opening…' : 'Open and start timer'}
          </button>
          <button
            type="button"
            onClick={() => open(false)}
            disabled={busy}
            className="rounded-sm border border-divider px-[15px] py-2 text-[13.5px] transition-colors hover:bg-tint disabled:opacity-40"
          >
            Just open it
          </button>
        </div>
      )}

      {error !== null && (
        <p className="mt-4 border-l-2 border-flag px-3 py-2 text-[13.5px]">{error}</p>
      )}
    </section>
  );
}
