import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { createNote, GENERAL_SECTION, type Section, sectionForPath } from '@/lib/model';
import { useProgress } from '@/store/useProgress';
import { useActivePrep, usePrepSections } from '../preps/usePreps';

export interface NoteContext {
  filePath: string;
  page?: number;
}

interface Props {
  /** What was open when the note was started, if anything. */
  context?: NoteContext | null;
  autoFocus?: boolean;
  onSaved?: () => void;
  onCancel?: () => void;
}

/**
 * The whole note-taking surface: a box, a section, and Save.
 *
 * Nothing here is required except the body. A note that costs a decision about
 * topic or tags before it can be written is a note that does not get written at
 * eleven at night, which makes the field worse than useless.
 */
export function NoteComposer({ context, autoFocus = false, onSaved, onCancel }: Props) {
  const addNote = useProgress((s) => s.addNote);
  const activePrepId = useProgress((s) => s.state.activePrepId);
  const prep = useActivePrep();
  const sections = usePrepSections();
  const defaultSection: Section = context
    ? sectionForPath(context.filePath, prep?.folder ?? '')
    : GENERAL_SECTION;

  const [body, setBody] = useState('');
  const [section, setSection] = useState<Section>(defaultSection);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setSection(defaultSection);
  }, [defaultSection]);

  useEffect(() => {
    if (autoFocus) bodyRef.current?.focus();
  }, [autoFocus]);

  const trimmed = body.trim();

  const save = () => {
    if (trimmed.length === 0) return;
    addNote(
      createNote({
        body: trimmed,
        section,
        prepId: activePrepId,
        ...(context ? { filePath: context.filePath } : {}),
        ...(context?.page !== undefined ? { page: context.page } : {}),
      }),
    );
    setBody('');
    onSaved?.();
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    save();
  };

  // Ctrl+Enter saves: the textarea owns Enter, and reaching for the mouse
  // mid-thought is the friction this is meant to avoid.
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      save();
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <textarea
        ref={bodyRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={onKeyDown}
        rows={3}
        placeholder="What is worth remembering?"
        className="w-full resize-y rounded border border-graphite/30 bg-surface px-2 py-1.5 text-sm leading-relaxed"
      />

      {context && (
        <p className="mt-1 truncate text-[11px] text-graphite" title={context.filePath}>
          on <span className="tabular text-ink">{context.filePath.split('/').at(-1)}</span>
          {context.page !== undefined && <span className="tabular"> p.{context.page}</span>}
        </p>
      )}

      <div className="mt-2 flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-xs text-graphite" htmlFor="note-section">
          Section
          <select
            id="note-section"
            value={section}
            onChange={(e) => setSection(e.target.value as Section)}
            className="rounded border border-graphite/30 bg-surface px-2 py-1 text-xs"
          >
            {sections.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-xs text-graphite underline-offset-2 hover:underline"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={trimmed.length === 0}
            title="Ctrl+Enter"
            className="rounded bg-ink px-3 py-1.5 text-xs font-medium text-paper disabled:opacity-40"
          >
            Save note
          </button>
        </div>
      </div>
    </form>
  );
}
