import { type FormEvent, useEffect, useRef, useState } from 'react';
import { folderSlug } from '@/lib/preps';
import { useVault } from '@/store/useVault';
import { joinPath } from '@/vault';
import { useActivePrep, usePrepTree } from '../preps/usePreps';

/**
 * Making a section without leaving the app.
 *
 * The app used to scaffold VARC/DILR/QA into every vault, so a folder was
 * always already there to import into. Nothing is scaffolded now - a prep for
 * an interview has no business being handed CAT sections - which makes this the
 * only way to get the first one without alt-tabbing to Explorer.
 *
 * Folders land at the prep root, because that is the level sectionForPath reads
 * a section from. Anything deeper is organisation the app does not interpret.
 */
export function NewFolder() {
  const ensureFolder = useVault((s) => s.ensureFolder);
  const prep = useActivePrep();
  // The folders that actually exist, not sectionsForPrep's list - that one adds
  // a synthetic GENERAL, and rejecting a name because of an entry with nothing
  // behind it would be a lie.
  const siblings = usePrepTree().filter((node) => node.isDirectory);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Slugged for the same reason a prep folder is: a colon or a question mark
  // makes a folder Windows will not create and an error that does not say why.
  const slug = folderSlug(name);
  const typed = name.trim().length > 0;
  const taken = siblings.some((node) => node.name.toLowerCase() === slug.toLowerCase());
  const valid = typed && !taken && !busy;

  const close = () => {
    setOpen(false);
    setName('');
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    const ok = await ensureFolder(joinPath(prep?.folder ?? '', slug));
    setBusy(false);
    if (ok) close();
  };

  if (!open) {
    return (
      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded px-1.5 py-0.5 text-[11px] text-graphite transition-colors hover:bg-graphite/10"
        >
          + New folder
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="px-3 pb-2">
      <input
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') close();
        }}
        placeholder="Indexing"
        aria-label="New folder name"
        className="tabular w-full rounded border border-graphite/30 bg-surface px-2 py-1 text-xs"
      />
      {taken && <p className="mt-1 text-[11px] text-flag">That folder already exists.</p>}
      {typed && slug !== name.trim() && !taken && (
        <p className="tabular mt-1 text-[11px] text-graphite">Creates {slug}</p>
      )}
      <div className="mt-1.5 flex items-center gap-2">
        <button
          type="submit"
          disabled={!valid}
          className="rounded bg-ink px-2 py-1 text-[11px] font-medium text-paper disabled:opacity-40"
        >
          {busy ? 'Creating\u2026' : 'Create'}
        </button>
        <button
          type="button"
          onClick={close}
          className="text-[11px] text-graphite underline-offset-2 hover:underline"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
