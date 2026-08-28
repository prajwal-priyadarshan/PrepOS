import { create } from 'zustand';

interface QuickNoteState {
  open: boolean;
  show: () => void;
  hide: () => void;
}

/**
 * Whether the quick-note sheet is up.
 *
 * A store rather than props: the sheet is opened from the header, from the
 * reader toolbar, and from the 'n' key, and threading a callback from App down
 * through the reader for that is worse than one flag.
 */
export const useQuickNote = create<QuickNoteState>((set) => ({
  open: false,
  show: () => set({ open: true }),
  hide: () => set({ open: false }),
}));
