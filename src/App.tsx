import { useEffect, useState } from 'react';
import { NotesPanel } from './features/notes/NotesPanel';
import { QuickNote } from './features/notes/QuickNote';
import { Reader } from './features/reader/Reader';
import { SaveSessionModal } from './features/reader/SaveSessionModal';
import { TimerHud } from './features/reader/TimerHud';
import { useSessionTimer } from './features/reader/useSessionTimer';
import { CameraSpike } from './features/recorder/CameraSpike';
import { AddPdfs } from './features/vault/AddPdfs';
import { ConnectScreen } from './features/vault/ConnectScreen';
import { FileTree } from './features/vault/FileTree';
import { daysToExam } from './lib/exam';
import { sectionForPath } from './lib/model';
import { studyDay } from './lib/studyDay';
import { installFlushHandlers, useProgress } from './store/useProgress';
import { useQuickNote } from './store/useQuickNote';
import { useSession } from './store/useSession';
import { useVault } from './store/useVault';

export default function App() {
  const status = useVault((s) => s.status);
  const root = useVault((s) => s.root);
  const tree = useVault((s) => s.tree);
  const error = useVault((s) => s.error);
  const restore = useVault((s) => s.restore);
  const refresh = useVault((s) => s.refresh);
  const disconnect = useVault((s) => s.disconnect);

  const loadProgress = useProgress((s) => s.load);
  const progressLoaded = useProgress((s) => s.loaded);
  const sessionCount = useProgress((s) => s.state.sessions.length);
  const noteCount = useProgress((s) => s.state.notes.length);
  const showQuickNote = useQuickNote((s) => s.show);

  const [selected, setSelected] = useState<string | null>(null);
  const openPdf = selected?.toLowerCase().endsWith('.pdf') === true ? selected : null;

  useSessionTimer();

  useEffect(() => {
    void restore();
    return installFlushHandlers();
  }, [restore]);

  // state.json lives inside the vault, so it can only be read once one is open.
  useEffect(() => {
    if (status === 'connected') void loadProgress();
  }, [status, loadProgress]);

  // The timer runs for as long as a PDF is open. Closing it, or switching to
  // another file, ends the session and raises the save modal.
  useEffect(() => {
    if (openPdf === null) return;
    const session = useSession.getState();
    session.start(openPdf);
    return () => session.stop();
  }, [openPdf]);

  if (status === 'starting') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper">
        <p className="text-sm text-graphite">Opening vault&hellip;</p>
      </main>
    );
  }

  if (status !== 'connected') return <ConnectScreen />;

  return (
    <div className="flex h-screen flex-col bg-paper text-ink">
      <header className="flex items-center justify-between gap-6 border-b border-graphite/20 px-5 py-3">
        <div className="flex min-w-0 items-baseline gap-4">
          <h1 className="font-display text-lg font-semibold tracking-tight">PrepOS</h1>
          <span className="truncate text-xs text-graphite" title={root ?? ''}>
            {root}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-5">
          <TimerHud />
          <button
            type="button"
            onClick={showQuickNote}
            title="New note (n)"
            className="rounded border border-graphite/40 px-2 py-1 text-xs text-graphite transition-colors hover:bg-graphite/10"
          >
            + Note
          </button>
          {progressLoaded && (
            <>
              <span className="text-xs text-graphite">
                <span className="tabular text-ink">{sessionCount}</span> sessions
              </span>
              <span className="text-xs text-graphite">
                <span className="tabular text-ink">{noteCount}</span> notes
              </span>
            </>
          )}
          <span className="text-xs text-graphite">
            <span className="tabular text-ink">{daysToExam()}</span> days to CAT
          </span>
          <span className="tabular text-xs text-graphite">{studyDay(new Date())}</span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-72 shrink-0 flex-col border-r border-graphite/20">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-[11px] font-medium uppercase tracking-widest text-graphite">
              Vault
            </span>
            <button
              type="button"
              onClick={refresh}
              className="rounded px-1.5 py-0.5 text-[11px] text-graphite hover:bg-graphite/10"
            >
              Refresh
            </button>
          </div>
          <nav className="min-h-0 flex-1 overflow-y-auto px-1 pb-3">
            <FileTree nodes={tree} onOpenFile={setSelected} selectedPath={selected} />
          </nav>
          <AddPdfs />
        </aside>

        <main className="min-h-0 flex-1">
          {openPdf !== null ? (
            <Reader filePath={openPdf} onClose={() => setSelected(null)} />
          ) : (
            <div className="h-full overflow-y-auto p-6">
              {error && (
                <p className="mb-4 rounded border-l-2 border-flag bg-flag/5 px-3 py-2 text-sm">
                  {error}
                </p>
              )}
              <div className="max-w-2xl space-y-5">
                <section className="rounded-md border border-graphite/20 bg-surface p-4">
                  <h2 className="font-display text-sm font-semibold">
                    {selected ? 'Not a PDF' : 'Nothing open'}
                  </h2>
                  {selected ? (
                    <>
                      <p className="tabular mt-2 break-all text-sm">{selected}</p>
                      <p className="mt-1 text-xs text-graphite">
                        Section <span className="tabular text-ink">{sectionForPath(selected)}</span>
                        <span> - the reader handles PDFs only.</span>
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-graphite">
                      Open a PDF from the tree. It reopens on the page you left, and the timer
                      starts on its own.
                    </p>
                  )}
                </section>

                <NotesPanel />

                <CameraSpike />

                <section className="rounded-md border border-graphite/20 bg-surface p-4">
                  <h2 className="font-display text-sm font-semibold">Vault</h2>
                  <button
                    type="button"
                    onClick={disconnect}
                    className="mt-3 rounded border border-graphite/40 px-3 py-1.5 text-xs text-graphite transition-colors hover:bg-graphite/10"
                  >
                    Forget this vault
                  </button>
                </section>
              </div>
            </div>
          )}
        </main>
      </div>

      <QuickNote />
      <SaveSessionModal />
    </div>
  );
}
