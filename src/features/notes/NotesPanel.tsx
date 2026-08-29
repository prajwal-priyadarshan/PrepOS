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
    <section>
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="m-0 text-lg font-semibold">Notes</h3>
        <span className="kicker whitespace-nowrap">
          <span className="tabular">{notes.length}</span> kept &middot; press n anywhere
        </span>
      </div>

      <NoteComposer />

      {ordered.length > 0 && (
        <ul className="mt-4">
          {shown.map((note) => (
            <li
              key={note.id}
              className="group grid grid-cols-[1fr_auto] gap-4 border-t border-divider py-[11px]"
            >
              <p
                className="m-0 whitespace-pre-wrap text-[13.5px] leading-[1.55] text-soft"
                data-selectable
              >
                {note.body}
              </p>
              <div className="flex shrink-0 items-baseline gap-3">
                <span
                  className="tabular text-[11px] text-muted"
                  title={
                    note.filePath === undefined
                      ? note.section
                      : `${note.section} · ${note.filePath}${note.page !== undefined ? ` p.${note.page}` : ''}`
                  }
                >
                  {note.studyDay} {timeOf(note.createdAt)}
                </span>
                <button
                  type="button"
                  onClick={() => removeNote(note.id)}
                  title="Delete this note"
                  className="text-[11px] text-muted opacity-0 transition-opacity hover:text-flag focus-visible:opacity-100 group-hover:opacity-100"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {ordered.length > INITIAL_SHOWN && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-3 text-[13.5px] text-accent transition-opacity hover:opacity-70"
        >
          {showAll ? 'Show recent only' : `Show all ${ordered.length}`}
        </button>
      )}
    </section>
  );
}
