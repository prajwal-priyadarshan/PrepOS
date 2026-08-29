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
      <label className="kicker mt-6 block" htmlFor="prep-name">
        What are you preparing for?
      </label>
      <input
        id="prep-name"
        ref={nameRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="DBMS endsem"
        className="mt-2 w-full rounded-sm border border-divider bg-surface px-[13px] py-2 text-sm"
      />

      <label className="kicker mt-4 block" htmlFor="prep-folder">
        Folder{editing && <span className="normal-case tracking-normal"> (fixed)</span>}
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
        className="tabular mt-2 w-full rounded-sm border border-divider bg-surface px-[13px] py-2 text-sm read-only:text-muted"
      />
      {editing ? (
        <p className="mt-1.5 text-[12.5px] text-muted">
          Move the folder in Explorer to change where this prep's material lives.
        </p>
      ) : (
        !free && (
          <p className="mt-1.5 text-[12.5px] text-flag">Another prep already uses that folder.</p>
        )
      )}

      <label className="kicker mt-4 block" htmlFor="prep-target">
        Deadline (optional)
      </label>
      <input
        id="prep-target"
        type="date"
        value={targetDate}
        onChange={(e) => setTargetDate(e.target.value)}
        className="tabular mt-2 w-full rounded-sm border border-divider bg-surface px-[13px] py-2 text-sm"
      />
      <p className="mt-1.5 text-[12.5px] text-muted">
        {targetDate === ''
          ? 'Left empty this prep is open-ended and shows no countdown.'
          : 'Clear the date to make this prep open-ended again.'}
      </p>
    </>
  );

  const actions = (
    <div className="mt-7 flex items-center justify-between">
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="text-[13.5px] text-muted transition-colors hover:text-accent"
        >
          Cancel
        </button>
      ) : (
        <span />
      )}
      <button
        type="submit"
        disabled={!valid}
        className="rounded-sm bg-accent px-[15px] py-2 text-[13.5px] text-on-accent transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {busy ? 'Saving\u2026' : editing ? 'Save prep' : 'Create prep'}
      </button>
    </div>
  );

  if (firstRun) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper px-6 text-ink">
        <form onSubmit={onSubmit} className="w-full max-w-md">
          <h1 className="m-0 text-[30px] font-semibold tracking-[-0.015em]">Your first prep</h1>
          <div className="mt-3 h-[3px] bg-ink" />
          <p className="mt-5 max-w-[62ch] text-sm leading-[1.55] text-soft [text-wrap:pretty]">
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
        className="animate-card-in w-full max-w-sm rounded-sm border border-divider bg-paper p-6"
      >
        <h2 className="m-0 text-[21px] font-semibold">{editing ? 'Edit prep' : 'New prep'}</h2>
        <p className="mt-1.5 text-[13.5px] leading-[1.55] text-soft">
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
