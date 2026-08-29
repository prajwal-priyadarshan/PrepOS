import { type FormEvent, useEffect, useRef, useState } from 'react';
import { newId, type Prep } from '@/lib/model';
import { folderIsFree, folderSlug } from '@/lib/preps';
import { useProgress } from '@/store/useProgress';
import { useVault } from '@/store/useVault';
import { usePreps } from './usePreps';

interface Props {
  /** The prep being changed. Absent creates one. */
  prep?: Prep;
  /**
   * Absent when this is the first prep of all: there is no workspace behind the
   * form to go back to, so it takes the screen and offers no way out.
   */
  onClose?: () => void;
}

/**
 * Name, folder, deadline - the whole of a prep.
 *
 * One component for all three moments (the first prep, a later one, editing an
 * existing one) because the fields and their rules are identical, and a second
 * copy of the folder-collision check is how the two would drift apart.
 *
 * The folder is fixed once a prep exists. It is where that prep's material
 * already sits, so re-pointing it would silently orphan every file rather than
 * move anything - a rename in Explorer is the honest way to do that.
 */
export function PrepDialog({ prep, onClose }: Props) {
  const preps = usePreps();
  const addPrep = useProgress((s) => s.addPrep);
  const updatePrep = useProgress((s) => s.updatePrep);
  const ensureFolder = useVault((s) => s.ensureFolder);

  const editing = prep !== undefined;
  const firstRun = onClose === undefined;

  const [name, setName] = useState(prep?.name ?? '');
  const [folder, setFolder] = useState(prep?.folder ?? '');
  const [folderTouched, setFolderTouched] = useState(false);
  const [targetDate, setTargetDate] = useState(prep?.targetDate ?? '');
  const [busy, setBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  // Until the folder is edited by hand it tracks the name.
  const effectiveFolder = editing ? prep.folder : folderTouched ? folder.trim() : folderSlug(name);
  const named = name.trim().length > 0;
  const free = editing || folderIsFree(preps, effectiveFolder);
  // A migrated prep is the vault root, folder ''. Only a new one has to name a
  // folder of its own.
  const rooted = editing || effectiveFolder.length > 0;
  const valid = named && rooted && free && !busy;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);

    // '' is the date input cleared, which is a deadline being removed - not a
    // field left alone. PrepEdit is what tells those apart.
    const deadline = targetDate === '' ? undefined : targetDate;

    if (editing) {
      updatePrep(prep.id, { name: name.trim(), targetDate: deadline });
      onClose?.();
      return;
    }

    // The folder has to exist before the prep points at it, or the first tree
    // read after switching comes back empty and looks like data loss.
    if (!(await ensureFolder(effectiveFolder))) {
      setBusy(false);
      return;
    }
    const created: Prep = {
      id: newId(),
      name: name.trim(),
      folder: effectiveFolder,
      ...(deadline !== undefined ? { targetDate: deadline } : {}),
    };
    addPrep(created);
    onClose?.();
  };

  const fields = (
    <>
      <label className="mt-4 block text-xs font-medium text-graphite" htmlFor="prep-name">
        What are you preparing for?
      </label>
      <input
        id="prep-name"
        ref={nameRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="DBMS endsem"
        className="mt-1 w-full rounded border border-graphite/30 bg-surface px-2 py-1.5 text-sm"
      />

      <label className="mt-3 block text-xs font-medium text-graphite" htmlFor="prep-folder">
        Folder{editing && <span className="ml-1 font-normal normal-case">(fixed)</span>}
      </label>
      <input
        id="prep-folder"
        value={effectiveFolder}
        readOnly={editing}
        onChange={(e) => {
          setFolderTouched(true);
          setFolder(e.target.value);
        }}
        placeholder={editing ? '/ (vault root)' : undefined}
        className="tabular mt-1 w-full rounded border border-graphite/30 bg-surface px-2 py-1.5 text-sm read-only:text-graphite"
      />
      {editing ? (
        <p className="mt-1 text-xs text-graphite">
          Move the folder in Explorer to change where this prep's material lives.
        </p>
      ) : (
        !free && <p className="mt-1 text-xs text-flag">Another prep already uses that folder.</p>
      )}

      <label className="mt-3 block text-xs font-medium text-graphite" htmlFor="prep-target">
        Deadline (optional)
      </label>
      <input
        id="prep-target"
        type="date"
        value={targetDate}
        onChange={(e) => setTargetDate(e.target.value)}
        className="tabular mt-1 w-full rounded border border-graphite/30 bg-surface px-2 py-1.5 text-sm"
      />
      <p className="mt-1 text-xs text-graphite">
        {targetDate === ''
          ? 'Left empty this prep is open-ended and shows no countdown.'
          : 'Clear the date to make this prep open-ended again.'}
      </p>
    </>
  );

  const actions = (
    <div className="mt-5 flex items-center justify-between">
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-graphite underline-offset-2 hover:underline"
        >
          Cancel
        </button>
      ) : (
        <span />
      )}
      <button
        type="submit"
        disabled={!valid}
        className="rounded bg-ink px-4 py-2 text-sm font-medium text-paper disabled:opacity-40"
      >
        {busy ? 'Saving\u2026' : editing ? 'Save prep' : 'Create prep'}
      </button>
    </div>
  );

  if (firstRun) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper px-6 text-ink">
        <form onSubmit={onSubmit} className="w-full max-w-md">
          <h1 className="font-display text-3xl font-semibold tracking-tight">Your first prep</h1>
          <p className="mt-3 text-sm leading-relaxed text-graphite">
            An exam, an interview, a certification &mdash; anything you are working towards. It gets
            a folder in your vault for its material and, if it has one, a date to count down to.
            Both can change later, and you can add as many preps as you like.
          </p>
          {fields}
          {actions}
        </form>
      </main>
    );
  }

  return (
    <div className="animate-backdrop-in fixed inset-0 z-50 flex items-start justify-center bg-scrim/50 p-6 pt-24">
      <form
        onSubmit={onSubmit}
        className="animate-card-in w-full max-w-sm rounded-lg border border-graphite/20 bg-surface p-5"
      >
        <h2 className="font-display text-base font-semibold">
          {editing ? 'Edit prep' : 'New prep'}
        </h2>
        <p className="mt-1 text-xs text-graphite">
          {editing
            ? 'Rename it or move its deadline. Its material stays where it is.'
            : 'A folder in your vault and a date to count down to. Both can change later.'}
        </p>
        {fields}
        {actions}
      </form>
    </div>
  );
}
