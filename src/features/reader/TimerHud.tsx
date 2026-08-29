import { formatDuration, isCounting, MAX_SESSION_MS } from '@/lib/sessionClock';
import { useSession } from '@/store/useSession';

/**
 * The running clock as seen from the dashboard.
 *
 * The reader draws its own, at reading size. This one is the header readout for
 * the two cases the reader cannot cover: a PDF left open while you step out to
 * Overview, and an external session running behind PowerPoint - which has no
 * reader view at all, and so needs its End session button to live here.
 */
export function TimerHud() {
  const filePath = useSession((s) => s.filePath);
  const clock = useSession((s) => s.clock);
  const paused = useSession((s) => s.paused);
  const windowHidden = useSession((s) => s.windowHidden);
  const capNotified = useSession((s) => s.capNotified);
  const togglePause = useSession((s) => s.togglePause);
  const stop = useSession((s) => s.stop);

  if (filePath === null) return null;

  // An external session is running in another window by definition, so the
  // hidden flag says nothing about it.
  const external = clock.external;
  const counting = !paused && (external || (!windowHidden && isCounting(clock, Date.now())));

  let state = 'idle';
  if (paused) state = 'paused';
  else if (external) state = 'external';
  else if (windowHidden) state = 'away';
  else if (counting) state = 'counting';

  return (
    <div className="flex items-center gap-3">
      {capNotified && (
        <span className="border-l-2 border-flag px-2.5 py-1 text-[11.5px]">
          {formatDuration(MAX_SESSION_MS)} in &mdash; take the break.
        </span>
      )}

      <span
        aria-hidden
        className={[
          'inline-block size-1.5 rounded-full transition-colors',
          counting ? 'bg-accent' : 'bg-muted',
        ].join(' ')}
      />
      <span className="tabular text-[13px]">{formatDuration(clock.activeMs)}</span>
      <span className="kicker">{state}</span>

      <button
        type="button"
        onClick={togglePause}
        title="Pause or resume (t)"
        className="text-[13.5px] text-muted transition-colors hover:text-accent"
      >
        {paused ? 'Resume' : 'Pause'}
      </button>
      <button
        type="button"
        onClick={stop}
        title="Log this sitting"
        className="text-[13.5px] text-accent transition-opacity hover:opacity-70"
      >
        End session
      </button>
    </div>
  );
}
