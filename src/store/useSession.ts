import { create } from 'zustand';
import { newId, type Section, type StudySession, sectionForPath } from '@/lib/model';
import { activePrepOf } from '@/lib/preps';
import {
  activeSeconds,
  advance,
  type ClockState,
  createClock,
  hasHitCap,
  onActivity,
  onVisibility,
} from '@/lib/sessionClock';
import { studyDay } from '@/lib/studyDay';
import { useProgress } from './useProgress';

/** What the save modal needs to know once the timer stops. */
export interface PendingSave {
  filePath: string;
  prepId: string;
  section: Section;
  startedAt: string;
  activeSeconds: number;
}

interface SessionState {
  filePath: string | null;
  startedAt: string | null;
  clock: ClockState;
  /** Manual pause, distinct from the window being hidden. */
  paused: boolean;
  windowHidden: boolean;
  capNotified: boolean;
  pending: PendingSave | null;

  start: (filePath: string, external?: boolean) => void;
  stop: () => void;
  discard: () => void;
  commit: (fields: {
    attempted?: number;
    correct?: number;
    note?: string;
    section: Section;
  }) => void;

  tick: () => void;
  activity: () => void;
  setWindowHidden: (hidden: boolean) => void;
  togglePause: () => void;
}

const now = () => Date.now();

export const useSession = create<SessionState>((set, get) => {
  /**
   * Clock counts only when neither manually paused nor window-hidden - except
   * for an external session, where our window being behind PowerPoint is the
   * normal case and says nothing about whether work is happening.
   */
  const syncHidden = (clock: ClockState, paused: boolean, windowHidden: boolean, at: number) =>
    onVisibility(clock, clock.external ? paused : paused || windowHidden, at);

  return {
    filePath: null,
    startedAt: null,
    clock: createClock(0),
    paused: false,
    windowHidden: false,
    capNotified: false,
    pending: null,

    start(filePath, external = false) {
      // Opening something new while a session runs ends that one properly
      // rather than discarding its minutes.
      if (get().filePath !== null && get().filePath !== filePath) get().stop();

      const at = now();
      set({
        filePath,
        startedAt: new Date(at).toISOString(),
        clock: createClock(at, external),
        paused: false,
        capNotified: false,
        pending: null,
      });
    },

    stop() {
      const { filePath, startedAt, clock } = get();
      if (filePath === null || startedAt === null) return;
      const settled = advance(clock, now());
      const seconds = activeSeconds(settled);

      set({ filePath: null, startedAt: null, clock: createClock(0), paused: false });

      // Under a minute is a misclick, not a study session worth logging.
      if (seconds < 60) return;

      // The prep is read when the session ends, not when it starts: switching
      // prep mid-session means the hours belong to what you ended up doing.
      const state = useProgress.getState().state;
      const prep = activePrepOf(state);

      set({
        pending: {
          filePath,
          prepId: state.activePrepId,
          section: sectionForPath(filePath, prep?.folder ?? ''),
          startedAt,
          activeSeconds: seconds,
        },
      });
    },

    discard() {
      set({ pending: null });
    },

    commit({ attempted, correct, note, section }) {
      const pending = get().pending;
      if (pending === null) return;

      // Neither field is required: a chapter read, a note taken, a recording
      // made - plenty of a sitting has no question count to give it, and a
      // session that can only be saved with one is a session people stop
      // logging honestly.
      const session: StudySession = {
        id: newId(),
        prepId: pending.prepId,
        studyDay: studyDay(new Date(pending.startedAt)),
        startedAt: pending.startedAt,
        activeSeconds: pending.activeSeconds,
        section,
        filePath: pending.filePath,
        ...(attempted !== undefined ? { attempted } : {}),
        ...(correct !== undefined ? { correct } : {}),
        ...(note !== undefined && note.length > 0 ? { note } : {}),
      };
      useProgress.getState().addSession(session);
      set({ pending: null });
    },

    tick() {
      const { filePath, clock, capNotified } = get();
      if (filePath === null) return;
      const at = now();
      const next = advance(clock, at);
      set({ clock: next });
      if (!capNotified && hasHitCap(next)) set({ capNotified: true, paused: true });
    },

    activity() {
      const { filePath, paused, windowHidden } = get();
      if (filePath === null || paused) return;
      // Real pointer/keyboard/scroll input reaching this window is proof it
      // isn't actually hidden, even if a stray or stuck visibilitychange event
      // said otherwise - WebView2 has been seen reporting a window hidden
      // while it's plainly in front of you and being used. Without this, that
      // one wrong event freezes the clock for the rest of the sitting: every
      // later activity() call bails out on windowHidden before it ever gets a
      // chance to correct it.
      if (windowHidden) get().setWindowHidden(false);
      set({ clock: onActivity(get().clock, now()) });
    },

    setWindowHidden(hidden) {
      const { filePath, clock, paused } = get();
      set({ windowHidden: hidden });
      if (filePath === null) return;
      set({ clock: syncHidden(clock, paused, hidden, now()) });
    },

    togglePause() {
      const { filePath, clock, paused, windowHidden } = get();
      if (filePath === null) return;
      const next = !paused;
      set({ paused: next, clock: syncHidden(clock, next, windowHidden, now()) });
    },
  };
});
