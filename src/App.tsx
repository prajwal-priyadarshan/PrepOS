import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { NotesPanel } from './features/notes/NotesPanel';
import { QuickNote } from './features/notes/QuickNote';
import { PrepDialog } from './features/preps/PrepDialog';
import { PrepActions } from './features/preps/PrepSwitcher';
import { useActivePrep, usePrepTree } from './features/preps/usePreps';
import { ExternalFile } from './features/reader/ExternalFile';
import { Reader } from './features/reader/Reader';
import { SaveSessionModal } from './features/reader/SaveSessionModal';
import { TimerHud } from './features/reader/TimerHud';
import { useSessionTimer } from './features/reader/useSessionTimer';
import { CameraSpike } from './features/recorder/CameraSpike';
import { ThemeToggle } from './features/settings/ThemeToggle';
import { StatsPanel } from './features/stats/StatsPanel';
import { AddPdfs } from './features/vault/AddPdfs';
import { ConnectScreen } from './features/vault/ConnectScreen';
import { FileTree } from './features/vault/FileTree';
import { NewFolder } from './features/vault/NewFolder';
import { summarise } from './lib/stats';
import { studyDay } from './lib/studyDay';
import { installFlushHandlers, useProgress } from './store/useProgress';
import { useSession } from './store/useSession';
import { useVault } from './store/useVault';
import type { TreeNode } from './vault';

function Waiting({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper">
      <p className="text-sm text-muted">{children}</p>
    </main>
  );
}

const isPdf = (path: string) => path.toLowerCase().endsWith('.pdf');

/** Depth-first, so the fallback is the first PDF a reader would see in the tree. */
function firstPdf(nodes: readonly TreeNode[]): string | null {
  for (const node of nodes) {
    if (!node.isDirectory && isPdf(node.path)) return node.path;
    const nested = node.children ? firstPdf(node.children) : null;
    if (nested !== null) return nested;
  }
  return null;
}

type View = 'overview' | 'reader';

export default function App() {
  const status = useVault((s) => s.status);
  const root = useVault((s) => s.root);
  const error = useVault((s) => s.error);
  const restore = useVault((s) => s.restore);
  const refresh = useVault((s) => s.refresh);
  const disconnect = useVault((s) => s.disconnect);

  const loadProgress = useProgress((s) => s.load);
  const progressLoaded = useProgress((s) => s.loaded);
  const state = useProgress((s) => s.state);
  const prepCount = state.preps.length;
  const prepTree = usePrepTree();
  const prep = useActivePrep();

  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<View>('overview');

  const openPdf = selected !== null && isPdf(selected) ? selected : null;
  const today = studyDay(new Date());
  const streak = useMemo(() => summarise(state, null, today).streak.current, [state, today]);

  useSessionTimer();

  useEffect(() => {
    void restore();
    const stopFlush = installFlushHandlers();
    return () => {
      stopFlush();
    };
  }, [restore]);

  // state.json lives inside the vault, so it can only be read once one is open.
  useEffect(() => {
    if (status === 'connected') void loadProgress();
  }, [status, loadProgress]);

  // The timer runs for as long as a PDF is open - not for as long as the reader
  // is the visible view. Stepping out to Overview to check a figure is not the
  // end of a sitting; closing the file is.
  useEffect(() => {
    if (openPdf === null) return;
    const session = useSession.getState();
    session.start(openPdf);
    return () => session.stop();
  }, [openPdf]);

  if (status === 'starting') return <Waiting>Opening vault&hellip;</Waiting>;

  if (status !== 'connected') return <ConnectScreen />;

  // state.json is only readable once a vault is open, so until it lands there is
  // no answer to 'are there any preps' - and rendering the workspace behind an
  // empty prep switcher is a flash of the wrong screen every launch.
  if (!progressLoaded) return <Waiting>Reading your preps&hellip;</Waiting>;

  // A vault with no preps has never been set up - either it is brand new, or it
  // was emptied. Nothing below works without one: sessions, notes and imports
  // all have to name the prep they belong to. Ask before, not after.
  if (prepCount === 0) return <PrepDialog />;

  const openFile = (path: string) => {
    setSelected(path);
    // The reader renders PDFs and nothing else. Anything else stays on the
    // dashboard, where ExternalFile offers to hand it to the app that owns it.
    setView(isPdf(path) ? 'reader' : 'overview');
  };

  // Closing the file is what ends the session and raises the save modal.
  const endSession = () => {
    setSelected(null);
    setView('overview');
  };

  const openReader = () => {
    if (openPdf === null) {
      const fallback = firstPdf(prepTree);
      if (fallback === null) return;
      setSelected(fallback);
    }
    setView('reader');
  };

  const readerReady = openPdf !== null || firstPdf(prepTree) !== null;

  const tab = (active: boolean) =>
    [
      'text-[13.5px] transition-colors',
      active ? 'text-accent underline underline-offset-4' : 'text-ink hover:text-accent',
    ].join(' ');

  return (
    <div className="flex h-screen flex-col bg-paper text-ink">
      {/* Front-page furniture: masthead, dateline rail, and the thick-thin rule
          pair. These are the only rules the page prints - every section below
          is bounded by whitespace instead. */}
      <header className="shrink-0 px-[34px] pt-[26px]">
        <div className="flex items-end justify-between gap-6">
          <h1 className="m-0 text-[30px] font-semibold leading-none tracking-[-0.015em]">PrepOS</h1>
          <div className="flex items-center gap-[18px]">
            <div className="tabular hidden items-baseline gap-[14px] text-[11.5px] text-muted sm:flex">
              <span className="max-w-56 truncate" title={prep?.name}>
                {prep?.name ?? 'No prep'}
              </span>
              <span>{state.sessions.length} sessions</span>
              <span>{state.notes.length} notes</span>
              <span>{today}</span>
            </div>
            <ThemeToggle />
          </div>
        </div>

        <div className="mt-3 h-[3px] bg-ink" />

        <div className="flex items-center justify-between gap-6 py-[7px]">
          <nav className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => setView('overview')}
              className={tab(view === 'overview')}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={openReader}
              disabled={!readerReady}
              title={readerReady ? undefined : 'No PDF in this prep yet'}
              className={[tab(view === 'reader'), 'disabled:text-muted disabled:no-underline'].join(
                ' ',
              )}
            >
              Reader
            </button>
            <PrepActions />
          </nav>

          <div className="flex shrink-0 items-center gap-4">
            <TimerHud />
            <span className="kicker whitespace-nowrap">
              <span className="tabular">{streak}</span> day streak
            </span>
          </div>
        </div>

        <div className="h-px bg-ink" />
      </header>

      {view === 'reader' && openPdf !== null ? (
        <Reader
          filePath={openPdf}
          onBackToVault={() => setView('overview')}
          onEndSession={endSession}
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 gap-x-[56px] gap-y-10 px-[34px] pb-10 pt-[30px] min-[900px]:grid-cols-[230px_1fr]">
            <aside className="flex flex-col">
              <div className="flex items-baseline justify-between gap-3">
                <span className="kicker">Vault</span>
                <button
                  type="button"
                  onClick={refresh}
                  title="Re-read the folder from disk"
                  className="text-[11.5px] text-accent transition-opacity hover:opacity-70"
                >
                  Refresh
                </button>
              </div>

              <nav className="mt-3.5">
                <FileTree nodes={prepTree} onOpenFile={openFile} selectedPath={selected} />
              </nav>

              <div className="mt-3.5">
                <NewFolder />
              </div>

              <p className="mt-3.5 text-[12.5px] text-muted">
                Click a file to open the timed reader.
              </p>

              <AddPdfs />
            </aside>

            <main className="flex min-w-0 flex-col gap-10">
              {error && (
                <p className="border-l-2 border-flag px-3 py-2 text-sm text-ink">{error}</p>
              )}

              <StatsPanel />

              {selected !== null && !isPdf(selected) ? (
                <ExternalFile filePath={selected} />
              ) : (
                <section>
                  <h3 className="m-0 mb-2 text-lg font-semibold">
                    {openPdf === null
                      ? 'Nothing open'
                      : (openPdf.split('/').at(-1) ?? 'Nothing open')}
                  </h3>
                  <p className="m-0 max-w-[62ch] text-sm leading-[1.55] text-soft [text-wrap:pretty]">
                    Open a PDF from the tree. It reopens on the page you left, and the timer starts
                    on its own. Slides and documents open in their own app, timed only if you ask.
                  </p>
                </section>
              )}

              <NotesPanel />

              <CameraSpike />

              <section>
                <h3 className="m-0 mb-1.5 text-lg font-semibold">Vault</h3>
                <p className="tabular m-0 break-all text-xs text-muted">{root}</p>
                <button
                  type="button"
                  onClick={disconnect}
                  className="mt-3 rounded-sm border border-divider px-[15px] py-2 text-[13.5px] transition-colors hover:bg-tint"
                >
                  Forget this vault
                </button>
              </section>
            </main>
          </div>
        </div>
      )}

      <QuickNote />
      <SaveSessionModal />
    </div>
  );
}
