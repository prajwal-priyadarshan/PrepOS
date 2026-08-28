import { formatDuration, isCounting, MAX_SESSION_MS } from '@/lib/sessionClock';
import { useSession } from '@/store/useSession';

export function TimerHud() {
  const filePath = useSession((s) => s.filePath);
  const clock = useSession((s) => s.clock);
  const paused = useSession((s) => s.paused);
  const windowHidden = useSession((s) => s.windowHidden);
  const capNotified = useSession((s) => s.capNotified);
  const togglePause = useSession((s) => s.togglePause);
  const stop = useSession((s) => s.stop);

  if (filePath === null) return null;

  const counting = !paused && !windowHidden && isCounting(clock, Date.now());
  let state = 'idle';
  if (paused) state = 'paused';
  else if (windowHidden) state = 'away';
  else if (counting) state = 'counting';

  return (
    <div className="flex items-center gap-3">
      {capNotified && (
        <span className="rounded border-l-2 border-flag bg-flag/10 px-2 py-1 text-[11px]">
          {formatDuration(MAX_SESSION_MS)} in &mdash; take the break.
        </span>
      )}

      <span
        aria-hidden
        className={[
          'inline-block size-2 rounded-full',
          counting ? 'bg-marker' : 'bg-graphite/40',
        ].join(' ')}
      />
      <span className="tabular text-sm">{formatDuration(clock.activeMs)}</span>
      <span className="text-[11px] uppercase tracking-widest text-graphite">{state}</span>

      <button
        type="button"
        onClick={togglePause}
        title="Pause or resume (t)"
        className="rounded px-2 py-1 text-xs text-graphite hover:bg-graphite/10"
      >
        {paused ? 'Resume' : 'Pause'}
      </button>
      <button
        type="button"
        onClick={stop}
        className="rounded border border-ink px-2 py-1 text-xs font-medium hover:bg-ink hover:text-paper"
      >
        End session
      </button>
    </div>
  );
}
