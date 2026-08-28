import { useEffect } from 'react';
import { useSession } from '@/store/useSession';

/** pointermove fires continuously; one stamp a second is plenty. */
const ACTIVITY_THROTTLE_MS = 1000;

/**
 * Installs the timer inputs once, at the app root. The clock itself does the
 * accounting - this only feeds it ticks, activity and visibility.
 */
export function useSessionTimer(): void {
  useEffect(() => {
    const tick = setInterval(() => useSession.getState().tick(), 1000);

    let lastStamp = 0;
    const activity = () => {
      const now = Date.now();
      if (now - lastStamp < ACTIVITY_THROTTLE_MS) return;
      lastStamp = now;
      useSession.getState().activity();
    };

    const visibility = () => {
      useSession.getState().setWindowHidden(document.visibilityState === 'hidden');
    };

    // 't' toggles the timer (plan S6.1). Reader owns arrows and Escape.
    const shortcut = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.target instanceof HTMLSelectElement) return;
      if (e.key !== 't' || e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      useSession.getState().togglePause();
    };

    window.addEventListener('pointermove', activity, { passive: true });
    window.addEventListener('keydown', activity);
    window.addEventListener('scroll', activity, { passive: true, capture: true });
    window.addEventListener('wheel', activity, { passive: true });
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('keydown', shortcut);

    return () => {
      clearInterval(tick);
      window.removeEventListener('pointermove', activity);
      window.removeEventListener('keydown', activity);
      window.removeEventListener('scroll', activity, { capture: true });
      window.removeEventListener('wheel', activity);
      window.removeEventListener('keydown', shortcut);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);
}
