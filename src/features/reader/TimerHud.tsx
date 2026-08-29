import { formatDuration, isCounting, MAX_SESSION_MS } from '@/lib/sessionClock';
import { useSession } from '@/store/useSession';

/**
 * The running clock as seen from Overview.
 *
 * App.tsx only mounts this while the workspace is on Overview - the reader
 * draws its own, at reading size, and the two running side by side would be
 * two clocks and two Pause buttons for one session.
 *
 * Boxed as one chip rather than left as loose inline pieces: a dot, a
 * duration, a state word, two buttons is five separate things fighting for
 * attention next to the tab row above it. Bordered and grouped, it reads as
 * one instrument with controls, the way the reader's own clock already does.
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
        <span className="whitespace-nowrap border-l-2 border-flag pl-2.5 text-[11.5px] text-ink">
          {formatDuration(MAX_SESSION_MS)} in &mdash; take the break.
        </span>
      )}

      <div className="flex items-center gap-2.5 rounded-sm border border-divider py-1.5 pl-3 pr-2">
        <span
          aria-hidden
          title={counting ? 'Counting' : 'Not counting'}
          className={[
            'inline-block size-1.5 shrink-0 rounded-full transition-colors',
            counting ? 'bg-accent' : 'bg-muted',
          ].join(' ')}
        />
        <span className="tabular whitespace-nowrap text-[13px] font-semibold leading-none">
          {formatDuration(clock.activeMs)}
        </span>
        <span className="kicker leading-none">{state}</span>

        <span aria-hidden className="h-3.5 w-px shrink-0 bg-divider" />

        <button
          type="button"
          onClick={togglePause}
          title="Pause or resume (t)"
          className="whitespace-nowrap rounded-sm px-1.5 py-0.5 text-[12.5px] text-muted transition-colors hover:bg-tint hover:text-accent"
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button
          type="button"
          onClick={stop}
          title="Log this sitting"
          className="whitespace-nowrap rounded-sm px-1.5 py-0.5 text-[12.5px] text-accent transition-colors hover:bg-tint"
        >
          End
        </button>
      </div>
    </div>
  );
}
