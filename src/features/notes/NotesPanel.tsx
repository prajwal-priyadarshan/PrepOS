import { useState } from 'react';
import type { NoteEntry } from '@/lib/model';
import { useProgress } from '@/store/useProgress';
import { NoteComposer } from './NoteComposer';

const INITIAL_SHOWN = 8;

function timeOf(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

/** Newest first. createdAt is absolute, so this is stable across the 4am boundary. */
function newestFirst(notes: readonly NoteEntry[]): NoteEntry[] {
  return [...notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function NotesPanel() {
  const notes = useProgress((s) => s.state.notes);
  const removeNote = useProgress((s) => s.removeNote);
  const [showAll, setShowAll] = useState(false);

  const ordered = newestFirst(notes);
  const shown = showAll ? ordered : ordered.slice(0, INITIAL_SHOWN);

  return (
    <section className="rounded-md border border-graphite/20 bg-surface p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-sm font-semibold">Notes</h2>
        <span className="text-[11px] text-graphite">
          <span className="tabular text-ink">{notes.length}</span> kept &middot; press <kbd>n</kbd>{' '}
          anywhere
        </span>
      </div>

      <div className="mt-3">
        <NoteComposer />
      </div>

      {ordered.length > 0 && (
        <ul className="mt-4 space-y-3 border-t border-graphite/15 pt-3">
          {shown.map((note) => (
            <li key={note.id} className="group">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[11px] text-graphite">
                  <span className="tabular text-ink">{note.studyDay}</span>
                  <span className="tabular"> {timeOf(note.createdAt)}</span>
                  <span> &middot; {note.section}</span>
                  {note.filePath !== undefined && (
                    <span title={note.filePath}>
                      <span> &middot; </span>
                      <span className="tabular">{note.filePath.split('/').at(-1)}</span>
                      {note.page !== undefined && <span className="tabular"> p.{note.page}</span>}
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => removeNote(note.id)}
                  title="Delete this note"
                  className="shrink-0 text-[11px] text-graphite opacity-0 transition-opacity hover:text-flag focus-visible:opacity-100 group-hover:opacity-100"
                >
                  Delete
                </button>
              </div>
              <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed" data-selectable>
                {note.body}
              </p>
            </li>
          ))}
        </ul>
      )}

      {ordered.length > INITIAL_SHOWN && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-3 text-xs text-graphite underline-offset-2 hover:underline"
        >
          {showAll ? 'Show recent only' : `Show all ${ordered.length}`}
        </button>
      )}
    </section>
  );
}
