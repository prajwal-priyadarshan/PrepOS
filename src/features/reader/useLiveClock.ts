import { useEffect, useState } from 'react';
import { advance, isCounting } from '@/lib/sessionClock';
import { useSession } from '@/store/useSession';

/**
 * The clock's number, recomputed and re-rendered on its own one-second beat
 * rather than trusting the shared session tick to reach this component.
 *
 * useSession's own interval (see useSessionTimer) still advances the stored
 * clock - that's what cap detection watches, and what makes a stop() or
 * pause() land on the right total without this hook's help. But a display
 * wired straight to clock.activeMs only moves when that shared tick's store
 * update actually triggers a re-render here, and if it's ever late or misses
 * one (a throttled interval, a heavy canvas repaint crowding the main
 * thread), the number just sits still until something else forces an update
 * - which reads as "the timer isn't running" even though the accounting
 * underneath is fine and pausing would reveal the correct total.
 *
 * This hook can't have that problem: it derives the live total itself, every
 * second, from whatever the store's clock currently holds, using the same
 * pure advance() the store uses - so the number on screen keeps moving on
 * its own regardless of what the shared tick is doing.
 */
export function useLiveClock(): { activeMs: number; counting: boolean } {
  const clock = useSession((s) => s.clock);
  const paused = useSession((s) => s.paused);
  const windowHidden = useSession((s) => s.windowHidden);
  const [, beat] = useState(0);

  useEffect(() => {
    const id = setInterval(() => beat((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Mirrors useSession's own syncHidden: our window being behind another app
  // is the normal case for an external session, so only a manual pause hides
  // it; otherwise either one does.
  const hidden = clock.external ? paused : paused || windowHidden;
  const counting = !hidden && (clock.external || isCounting(clock, Date.now()));
  const activeMs = advance({ ...clock, hidden }, Date.now()).activeMs;

  return { activeMs, counting };
}
