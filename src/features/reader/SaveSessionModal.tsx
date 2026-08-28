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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/50 p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-lg border border-graphite/20 bg-surface p-5"
      >
        <h2 className="font-display text-base font-semibold">Log this session</h2>
        <p className="mt-1 text-xs text-graphite">
          <span className="tabular text-ink">{formatDuration(pending.activeSeconds * 1000)}</span>
          <span> active on </span>
          <span className="break-all">{fileName}</span>
        </p>

        <label className="mt-4 block text-xs font-medium text-graphite" htmlFor="section">
          Section
        </label>
        <select
          id="section"
          value={section}
          onChange={(e) => setSection(e.target.value as Section)}
          className="mt-1 w-full rounded border border-graphite/30 bg-surface px-2 py-1.5 text-sm"
        >
          {/* The section the file sits in may not be one of the prep's folders
              any more - keep it selectable rather than silently rewriting it. */}
          {(sections.includes(section) ? sections : [section, ...sections]).map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-graphite" htmlFor="attempted">
              Attempted
            </label>
            <input
              id="attempted"
              ref={firstFieldRef}
              inputMode="numeric"
              value={attempted}
              onChange={(e) => setAttempted(digitsOnly(e.target.value))}
              className="tabular mt-1 w-full rounded border border-graphite/30 bg-surface px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-graphite" htmlFor="correct">
              Correct
            </label>
            <input
              id="correct"
              inputMode="numeric"
              value={correct}
              onChange={(e) => setCorrect(digitsOnly(e.target.value))}
              className="tabular mt-1 w-full rounded border border-graphite/30 bg-surface px-2 py-1.5 text-sm"
            />
          </div>
        </div>

        {filled && !valid && (
          <p className="mt-2 text-xs text-flag">Correct cannot exceed attempted.</p>
        )}

        <label className="mt-3 block text-xs font-medium text-graphite" htmlFor="note">
          Note (optional)
        </label>
        <input
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="mt-1 w-full rounded border border-graphite/30 bg-surface px-2 py-1.5 text-sm"
        />

        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            onClick={discard}
            className="text-xs text-graphite underline-offset-2 hover:underline"
          >
            Discard
          </button>
          <button
            type="submit"
            disabled={!valid}
            className="rounded bg-ink px-4 py-2 text-sm font-medium text-paper disabled:opacity-40"
          >
            Save session
          </button>
        </div>
      </form>
    </div>
  );
}
