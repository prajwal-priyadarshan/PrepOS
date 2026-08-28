import { create } from 'zustand';
import { newId, type Section, type StudySession, sectionForPath } from '@/lib/model';
import { activePrepOf } from '@/lib/preps';
import {
  activeSeconds,
  advance,
  type ClockState,
  createClock,
  hasHitCap,
  isCounting,
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
  commit: (fields: { attempted: number; correct: number; note?: string; section: Section }) => void;

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

      const session: StudySession = {
        id: newId(),
        prepId: pending.prepId,
        studyDay: studyDay(new Date(pending.startedAt)),
        startedAt: pending.startedAt,
        activeSeconds: pending.activeSeconds,
        section,
        filePath: pending.filePath,
        attempted,
        correct,
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
      const { filePath, clock, paused, windowHidden } = get();
      if (filePath === null || paused || windowHidden) return;
      if (isCounting(clock, now())) {
        // Cheap path: already counting, just refresh the activity stamp.
        set({ clock: onActivity(clock, now()) });
        return;
      }
      set({ clock: onActivity(clock, now()) });
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
