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
 * eleven at night, which makes the field worse than useless - which is why the
 * section sits under the field as a plain machine string rather than as a
 * labelled control demanding an answer first.
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
        placeholder="What is worth remembering?"
        className="mt-3 min-h-[82px] w-full resize-y rounded-sm border border-divider bg-surface px-[13px] py-3 text-sm leading-[1.55] text-ink"
      />

      {context && (
        <p className="tabular mt-1.5 truncate text-[11.5px] text-muted" title={context.filePath}>
          on {context.filePath.split('/').at(-1)}
          {context.page !== undefined && <span> p.{context.page}</span>}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-4">
        {/* Styled down to the machine string it is. The design prints the
            section as a mono label; making that label the control itself is
            what keeps a required decision from looking like one. */}
        <select
          value={section}
          onChange={(e) => setSection(e.target.value as Section)}
          aria-label="Section"
          title="Which section this note belongs to"
          className="tabular -ml-1 max-w-40 cursor-pointer truncate rounded-sm border-0 bg-transparent px-1 py-0.5 text-[11.5px] uppercase text-muted transition-colors hover:text-accent"
        >
          {sections.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        <div className="flex shrink-0 items-center gap-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-[13.5px] text-muted transition-colors hover:text-accent"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={trimmed.length === 0}
            title="Ctrl+Enter"
            className="rounded-sm bg-accent px-[15px] py-2 text-[13.5px] text-on-accent transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Save note
          </button>
        </div>
      </div>
    </form>
  );
}
