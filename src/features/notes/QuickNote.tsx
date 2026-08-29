import { useEffect } from 'react';
import { useProgress } from '@/store/useProgress';
import { useQuickNote } from '@/store/useQuickNote';
import { useSession } from '@/store/useSession';
import { NoteComposer, type NoteContext } from './NoteComposer';

/**
 * A note from anywhere, at any time, without leaving the page you are on.
 *
 * Always mounted so it can own the 'n' shortcut; renders nothing until opened.
 * It attaches the open file and page on its own, which is what makes a note
 * written mid-set still legible in month seven.
 */
export function QuickNote() {
  const open = useQuickNote((s) => s.open);
  const show = useQuickNote((s) => s.show);
  const hide = useQuickNote((s) => s.hide);

  const filePath = useSession((s) => s.filePath);
  const page = useProgress((s) => (filePath === null ? undefined : s.state.lastPage[filePath]));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Checked before the field guard below: Escape has to work while the
      // cursor is still in the note being written.
      if (e.key === 'Escape') {
        if (!useQuickNote.getState().open) return;
        e.preventDefault();
        hide();
        return;
      }
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.target instanceof HTMLSelectElement) return;
      if (e.key !== 'n' || e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      show();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [show, hide]);

  if (!open) return null;

  const context: NoteContext | null =
    filePath === null ? null : { filePath, ...(page !== undefined ? { page } : {}) };

  return (
    <div className="animate-backdrop-in fixed inset-0 z-40 flex items-start justify-center bg-scrim/50 p-6 pt-24">
      <div className="animate-card-in w-full max-w-md rounded-lg border border-graphite/20 bg-surface p-5">
        <h2 className="font-display text-base font-semibold">Quick note</h2>
        <p className="mt-1 text-xs text-graphite">
          Saved to this vault. <kbd>Esc</kbd> to close.
        </p>
        <div className="mt-3">
          <NoteComposer context={context} autoFocus onSaved={hide} onCancel={hide} />
        </div>
      </div>
    </div>
  );
}
