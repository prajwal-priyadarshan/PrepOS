import { type FormEvent, useEffect, useRef, useState } from 'react';
import { GENERAL_SECTION, type Section } from '@/lib/model';
import { formatDuration } from '@/lib/sessionClock';
import { useSession } from '@/store/useSession';
import { usePrepSections } from '../preps/usePreps';

const digitsOnly = (value: string) => value.replace(/[^0-9]/g, '');

/**
 * A closing question, not a closing form.
 *
 * Attempted and correct are what turn a pile of logged hours into an accuracy
 * trend - worth asking for. But a sitting is not always about questions: a
 * chapter read, a note taken, a recording made all end here too, and a modal
 * that refuses to save until two numbers are filled in teaches people to
 * either invent them or stop logging the sitting at all. Left blank, the
 * session saves as active time and nothing else - still real, still counted
 * in the hours and the streak, just silent on accuracy.
 *
 * The one rule that survives: fill in one and the other has to follow. A lone
 * "attempted" or a lone "correct" is not a number, it is half of one.
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

  const attemptedGiven = attempted !== '';
  const correctGiven = correct !== '';
  const bothGiven = attemptedGiven && correctGiven;
  const attemptedNum = Number(attempted);
  const correctNum = Number(correct);
  const partial = attemptedGiven !== correctGiven;
  const valid = !partial && (!bothGiven || correctNum <= attemptedNum);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    commit({
      section,
      ...(bothGiven ? { attempted: attemptedNum, correct: correctNum } : {}),
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

        <span className="kicker mt-4 block">Questions (optional)</span>
        <div className="mt-2 grid grid-cols-2 gap-4">
          <div>
            <label className="sr-only" htmlFor="attempted">
              Attempted
            </label>
            <input
              id="attempted"
              ref={firstFieldRef}
              inputMode="numeric"
              placeholder="Attempted"
              value={attempted}
              onChange={(e) => setAttempted(digitsOnly(e.target.value))}
              className="tabular w-full rounded-sm border border-divider bg-surface px-[13px] py-2 text-sm placeholder:text-muted"
            />
          </div>
          <div>
            <label className="sr-only" htmlFor="correct">
              Correct
            </label>
            <input
              id="correct"
              inputMode="numeric"
              placeholder="Correct"
              value={correct}
              onChange={(e) => setCorrect(digitsOnly(e.target.value))}
              className="tabular w-full rounded-sm border border-divider bg-surface px-[13px] py-2 text-sm placeholder:text-muted"
            />
          </div>
        </div>

        {partial ? (
          <p className="mt-2 text-[12.5px] text-flag">Fill in both, or leave both blank.</p>
        ) : bothGiven && !valid ? (
          <p className="mt-2 text-[12.5px] text-flag">Correct cannot exceed attempted.</p>
        ) : (
          !bothGiven && (
            <p className="mt-2 text-[12.5px] text-muted">
              Nothing to attempt today? Leave these blank - the time still counts.
            </p>
          )
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
