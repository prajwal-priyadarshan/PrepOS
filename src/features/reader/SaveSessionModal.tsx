import { type FormEvent, useEffect, useRef, useState } from 'react';
import { GENERAL_SECTION, type Section } from '@/lib/model';
import { formatDuration } from '@/lib/sessionClock';
import { useSession } from '@/store/useSession';
import { usePrepSections } from '../preps/usePreps';

const digitsOnly = (value: string) => value.replace(/[^0-9]/g, '');

/**
 * Four seconds of friction, deliberately.
 *
 * attempted and correct are required: they are the fields that turn a pile of
 * logged hours into an accuracy trend, and a session saved without them teaches
 * you nothing in month seven.
 */
export function SaveSessionModal() {
  const pending = useSession((s) => s.pending);
  const commit = useSession((s) => s.commit);
  const discard = useSession((s) => s.discard);

  const sections = usePrepSections();
  const [section, setSection] = useState<Section>(GENERAL_SECTION);
  const [attempted, setAttempted] = useState('');
  const [correct, setCorrect] = useState('');
  const [note, setNote] = useState('');
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (pending) {
      setSection(pending.section);
      setAttempted('');
      setCorrect('');
      setNote('');
      firstFieldRef.current?.focus();
    }
  }, [pending]);

  if (pending === null) return null;

  const attemptedNum = Number(attempted);
  const correctNum = Number(correct);
  const filled = attempted !== '' && correct !== '';
  const valid = filled && correctNum <= attemptedNum;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    commit({
      attempted: attemptedNum,
      correct: correctNum,
      section,
      ...(note.trim().length > 0 ? { note: note.trim() } : {}),
    });
  };

  const fileName = pending.filePath.split('/').at(-1);

  return (
    <div className="animate-backdrop-in fixed inset-0 z-50 flex items-center justify-center bg-scrim/50 p-6">
      <form
        onSubmit={onSubmit}
        className="animate-card-in w-full max-w-sm rounded-sm border border-divider bg-paper p-6"
      >
        <h2 className="m-0 text-[21px] font-semibold">Log this session</h2>
        <p className="mt-1.5 text-[13.5px] text-soft">
          <span className="tabular">{formatDuration(pending.activeSeconds * 1000)}</span>
          <span> active on </span>
          <span className="tabular break-all">{fileName}</span>
        </p>

        <label className="kicker mt-6 block" htmlFor="section">
          Section
        </label>
        <select
          id="section"
          value={section}
          onChange={(e) => setSection(e.target.value as Section)}
          className="mt-2 w-full cursor-pointer rounded-sm border border-divider bg-surface px-[13px] py-2 text-sm"
        >
          {/* The section the file sits in may not be one of the prep's folders
              any more - keep it selectable rather than silently rewriting it. */}
          {(sections.includes(section) ? sections : [section, ...sections]).map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <label className="kicker block" htmlFor="attempted">
              Attempted
            </label>
            <input
              id="attempted"
              ref={firstFieldRef}
              inputMode="numeric"
              value={attempted}
              onChange={(e) => setAttempted(digitsOnly(e.target.value))}
              className="tabular mt-2 w-full rounded-sm border border-divider bg-surface px-[13px] py-2 text-sm"
            />
          </div>
          <div>
            <label className="kicker block" htmlFor="correct">
              Correct
            </label>
            <input
              id="correct"
              inputMode="numeric"
              value={correct}
              onChange={(e) => setCorrect(digitsOnly(e.target.value))}
              className="tabular mt-2 w-full rounded-sm border border-divider bg-surface px-[13px] py-2 text-sm"
            />
          </div>
        </div>

        {filled && !valid && (
          <p className="mt-2 text-[12.5px] text-flag">Correct cannot exceed attempted.</p>
        )}

        <label className="kicker mt-4 block" htmlFor="note">
          Note (optional)
        </label>
        <input
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="mt-2 w-full rounded-sm border border-divider bg-surface px-[13px] py-2 text-sm"
        />

        <div className="mt-7 flex items-center justify-between">
          <button
            type="button"
            onClick={discard}
            className="text-[13.5px] text-muted transition-colors hover:text-accent"
          >
            Discard
          </button>
          <button
            type="submit"
            disabled={!valid}
            className="rounded-sm bg-accent px-[15px] py-2 text-[13.5px] text-on-accent transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Save session
          </button>
        </div>
      </form>
    </div>
  );
}
