import { studyDay } from '@/lib/studyDay';
import { useVault } from '@/store/useVault';
import { STATE_PATH } from '@/vault';
import { ThemeToggle } from '../settings/ThemeToggle';

/**
 * The front page, before there is anything to report.
 *
 * It prints the same furniture the dashboard does - masthead, dateline rail,
 * thick-thin rule pair - so the first screen a person meets is recognisably the
 * same paper as every screen after it.
 */
export function ConnectScreen() {
  const connect = useVault((s) => s.connect);
  const status = useVault((s) => s.status);
  const error = useVault((s) => s.error);

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-6 text-ink">
      <div className="w-full max-w-lg">
        <div className="flex items-end justify-between gap-6">
          <h1 className="m-0 text-[30px] font-semibold leading-none tracking-[-0.015em]">PrepOS</h1>
          <div className="flex items-center gap-[18px]">
            <span className="tabular hidden text-[11.5px] text-muted sm:inline">
              {studyDay(new Date())}
            </span>
            <ThemeToggle />
          </div>
        </div>

        <div className="mt-3 h-[3px] bg-ink" />
        <div className="flex items-center justify-between py-[7px]">
          <span className="kicker">No vault yet</span>
        </div>
        <div className="h-px bg-ink" />

        <p className="mt-8 max-w-[62ch] text-sm leading-[1.55] text-soft [text-wrap:pretty]">
          Point this at the folder your study material lives in &mdash; one exam, several, or
          everything you are preparing for. It reads whatever is already there; nothing is moved or
          renamed. Everything it records goes into <span className="tabular">{STATE_PATH}</span>{' '}
          inside that same folder, so the folder is the backup.
        </p>

        <button
          type="button"
          onClick={connect}
          disabled={status === 'connecting'}
          className="mt-7 rounded-sm bg-accent px-[15px] py-2.5 text-[13.5px] text-on-accent transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {status === 'connecting' ? 'Waiting for folder…' : 'Choose vault folder'}
        </button>

        {error && <p className="mt-5 border-l-2 border-flag px-3 py-2 text-[13.5px]">{error}</p>}

        <p className="mt-10 border-t border-divider pt-4 text-[12.5px] text-muted">
          You choose the preps and their deadlines next.
        </p>
      </div>
    </main>
  );
}
