import { type FormEvent, useEffect, useRef, useState } from 'react';
import { newId, type Prep } from '@/lib/model';
import { folderIsFree, folderSlug } from '@/lib/preps';
import { useProgress } from '@/store/useProgress';
import { useVault } from '@/store/useVault';
import { usePreps } from './usePreps';

interface Props {
  onClose: () => void;
}

/**
 * Three fields, one of them optional.
 *
 * The folder is the only one that matters structurally - it is where material
 * goes and what sections get read from - so it is shown rather than hidden,
 * pre-filled from the name and editable when the guess is wrong.
 */
export function NewPrepDialog({ onClose }: Props) {
  const preps = usePreps();
  const addPrep = useProgress((s) => s.addPrep);
  const ensureFolder = useVault((s) => s.ensureFolder);

  const [name, setName] = useState('');
  const [folder, setFolder] = useState('');
  const [folderTouched, setFolderTouched] = useState(false);
  const [targetDate, setTargetDate] = useState('');
  const [busy, setBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  // Until the folder is edited by hand it tracks the name.
  const effectiveFolder = folderTouched ? folder.trim() : folderSlug(name);
  const named = name.trim().length > 0;
  const free = folderIsFree(preps, effectiveFolder);
  const valid = named && effectiveFolder.length > 0 && free && !busy;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    // The folder has to exist before the prep points at it, or the first tree
    // read after switching comes back empty and looks like data loss.
    const ok = await ensureFolder(effectiveFolder);
    if (!ok) {
      setBusy(false);
      return;
    }
    const prep: Prep = {
      id: newId(),
      name: name.trim(),
      folder: effectiveFolder,
      ...(targetDate !== '' ? { targetDate } : {}),
    };
    addPrep(prep);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-scrim/50 p-6 pt-24">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-lg border border-graphite/20 bg-surface p-5"
      >
        <h2 className="font-display text-base font-semibold">New prep</h2>
        <p className="mt-1 text-xs text-graphite">
          A folder in your vault and a date to count down to. Both can change later.
        </p>

        <label className="mt-4 block text-xs font-medium text-graphite" htmlFor="prep-name">
          Name
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
          Folder
        </label>
        <input
          id="prep-folder"
          value={effectiveFolder}
          onChange={(e) => {
            setFolderTouched(true);
            setFolder(e.target.value);
          }}
          className="tabular mt-1 w-full rounded border border-graphite/30 bg-surface px-2 py-1.5 text-sm"
        />
        {!free && <p className="mt-1 text-xs text-flag">Another prep already uses that folder.</p>}

        <label className="mt-3 block text-xs font-medium text-graphite" htmlFor="prep-target">
          Target date (optional)
        </label>
        <input
          id="prep-target"
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          className="tabular mt-1 w-full rounded border border-graphite/30 bg-surface px-2 py-1.5 text-sm"
        />

        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-graphite underline-offset-2 hover:underline"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!valid}
            className="rounded bg-ink px-4 py-2 text-sm font-medium text-paper disabled:opacity-40"
          >
            {busy ? 'Creating\u2026' : 'Create prep'}
          </button>
        </div>
      </form>
    </div>
  );
}
