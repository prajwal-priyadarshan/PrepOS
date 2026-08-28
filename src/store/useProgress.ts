import { create } from 'zustand';
import {
  type AppState,
  type ErrorEntry,
  emptyState,
  type MockResult,
  type NoteEntry,
  type ReadingEntry,
  type Recording,
  type StudySession,
} from '@/lib/model';
import { StatePersister } from '@/lib/persist';
import { computeStreak } from '@/lib/streak';
import { studyDay } from '@/lib/studyDay';
import { vault } from '@/vault';

const persister = new StatePersister(vault);

/**
 * streakFreezesUsed is derived, not authored: computeStreak owns the rule and
 * this keeps the stored ledger in step so the UI can show which days were
 * bridged without recomputing on every render.
 */
function withDerived(state: AppState): AppState {
  const { freezesUsed } = computeStreak(state.sessions, studyDay(new Date()));
  return { ...state, streakFreezesUsed: freezesUsed };
}

interface ProgressState {
  state: AppState;
  loaded: boolean;
  error: string | null;

  load: () => Promise<void>;
  flush: () => Promise<void>;

  setLastPage: (filePath: string, page: number) => void;
  addSession: (session: StudySession) => void;
  addReading: (entry: ReadingEntry) => void;
  addNote: (note: NoteEntry) => void;
  removeNote: (id: string) => void;
  addError: (entry: ErrorEntry) => void;
  addMock: (mock: MockResult) => void;
  addRecording: (recording: Recording) => void;
  markErrorReviewed: (id: string, on: string) => void;
}

export const useProgress = create<ProgressState>((set, get) => {
  /** Single mutation path: derive, store, queue the debounced write. */
  const commit = (next: AppState) => {
    const derived = withDerived(next);
    set({ state: derived });
    persister.save(derived);
  };

  return {
    state: emptyState(),
    loaded: false,
    error: null,

    async load() {
      try {
        set({ state: await persister.load(), loaded: true, error: null });
      } catch (err) {
        set({ error: err instanceof Error ? err.message : String(err), loaded: true });
      }
    },

    flush: () => persister.flush(),

    setLastPage(filePath, page) {
      const state = get().state;
      if (state.lastPage[filePath] === page) return;
      commit({ ...state, lastPage: { ...state.lastPage, [filePath]: page } });
    },

    addSession(session) {
      const state = get().state;
      commit({ ...state, sessions: [...state.sessions, session] });
    },

    addReading(entry) {
      const state = get().state;
      commit({ ...state, reading: [...state.reading, entry] });
    },

    addNote(note) {
      const state = get().state;
      commit({ ...state, notes: [...state.notes, note] });
    },

    removeNote(id) {
      const state = get().state;
      commit({ ...state, notes: state.notes.filter((n) => n.id !== id) });
    },

    addError(entry) {
      const state = get().state;
      commit({ ...state, errors: [...state.errors, entry] });
    },

    addMock(mock) {
      const state = get().state;
      commit({ ...state, mocks: [...state.mocks, mock] });
    },

    addRecording(recording) {
      const state = get().state;
      commit({ ...state, recordings: [...state.recordings, recording] });
    },

    markErrorReviewed(id, on) {
      const state = get().state;
      commit({
        ...state,
        errors: state.errors.map((e) => (e.id === id ? { ...e, reviewedOn: on } : e)),
      });
    },
  };
});

/**
 * A 10s debounce is only safe if these fire. Losing the last session of a night
 * because the window closed is exactly the failure this app cannot have.
 */
export function installFlushHandlers(): () => void {
  const flush = () => {
    void useProgress.getState().flush();
  };
  window.addEventListener('blur', flush);
  window.addEventListener('beforeunload', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
  return () => {
    window.removeEventListener('blur', flush);
    window.removeEventListener('beforeunload', flush);
  };
}
