/**
 * Active-time accounting for a study session.
 *
 * Pure and clock-injected so the awkward cases - tabbing away mid-session,
 * going idle then coming back, a laptop lid closed for an hour - are unit
 * testable rather than discovered as inflated hours in month three.
 *
 * The invariant: activeMs is accurate up to lastCountedAt, and time is only
 * counted when the window is visible and the user was active within IDLE_MS.
 */

/** No pointermove / keydown / scroll for this long counts as away. */
export const IDLE_MS = 90_000;

/** If you have genuinely been going three hours, take the break. */
export const MAX_SESSION_MS = 3 * 60 * 60 * 1000;

export interface ClockState {
  activeMs: number;
  /** activeMs is correct as of this instant. */
  lastCountedAt: number;
  lastActivityAt: number;
  hidden: boolean;
  /**
   * The work is happening in another application - PowerPoint, Word, a browser.
   *
   * Neither the visibility rule nor the idle rule can observe that: our window
   * is behind theirs and receives no events, so both would read genuine study
   * as away. An external session suspends them and runs until it is ended by
   * hand. The three-hour cap is the only guard left, which is why this is opt
   * in per file rather than the default.
   */
  external: boolean;
}

export function createClock(now: number, external = false): ClockState {
  return { activeMs: 0, lastCountedAt: now, lastActivityAt: now, hidden: false, external };
}

/**
 * Bring accounting up to `now`, crediting only visible, non-idle time - or,
 * for an external session, everything that is not explicitly paused.
 */
export function advance(state: ClockState, now: number): ClockState {
  if (now <= state.lastCountedAt) return state;

  let countedUntil: number;
  if (state.hidden) {
    // Explicitly paused, or tabbed away - none of this is study time. Still
    // honoured for an external session: pause has to mean pause.
    countedUntil = state.lastCountedAt;
  } else if (state.external) {
    countedUntil = now;
  } else {
    // Credit up to the moment idleness began, and no further.
    const idleFrom = state.lastActivityAt + IDLE_MS;
    countedUntil = Math.min(now, Math.max(state.lastCountedAt, idleFrom));
  }

  return {
    ...state,
    activeMs: state.activeMs + Math.max(0, countedUntil - state.lastCountedAt),
    lastCountedAt: now,
  };
}

export function onActivity(state: ClockState, now: number): ClockState {
  return { ...advance(state, now), lastActivityAt: now };
}

/** Becoming visible again counts as activity - the user is plainly back. */
export function onVisibility(state: ClockState, hidden: boolean, now: number): ClockState {
  const advanced = advance(state, now);
  return {
    ...advanced,
    hidden,
    lastActivityAt: hidden ? advanced.lastActivityAt : now,
  };
}

export function isIdle(state: ClockState, now: number): boolean {
  if (state.external) return false;
  return !state.hidden && now - state.lastActivityAt >= IDLE_MS;
}

export function isCounting(state: ClockState, now: number): boolean {
  return !state.hidden && !isIdle(state, now);
}

export function activeSeconds(state: ClockState): number {
  return Math.floor(state.activeMs / 1000);
}

export function hasHitCap(state: ClockState): boolean {
  return state.activeMs >= MAX_SESSION_MS;
}

/** '1h 04m' / '12m 30s' - mono digits, no jitter as they change. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}
