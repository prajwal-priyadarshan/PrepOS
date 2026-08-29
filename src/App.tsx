import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { NotesPanel } from './features/notes/NotesPanel';
import { QuickNote } from './features/notes/QuickNote';
import { PrepDialog } from './features/preps/PrepDialog';
import { PrepActions } from './features/preps/PrepSwitcher';
import { useActivePrep, usePreps, usePrepTree } from './features/preps/usePreps';
import { ExternalFile } from './features/reader/ExternalFile';
import { Reader } from './features/reader/Reader';
import { SaveSessionModal } from './features/reader/SaveSessionModal';
import { TimerHud } from './features/reader/TimerHud';
import { useSessionTimer } from './features/reader/useSessionTimer';
import { CameraRecorder } from './features/recorder/CameraRecorder';
import { ThemeToggle } from './features/settings/ThemeToggle';
import { Dashboard } from './features/stats/Dashboard';
import { PrepStats } from './features/stats/PrepStats';
import { AddFiles } from './features/vault/AddFiles';
import { ConnectScreen } from './features/vault/ConnectScreen';
import { FileTree } from './features/vault/FileTree';
import { NewFolder } from './features/vault/NewFolder';
import type { Prep } from './lib/model';
import { treeForPrep } from './lib/prepTree';
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

/**
 * The dashboard - every prep, the overall ledger - versus one prep's own
 * workspace. Entering a prep is the only door between them: see enterPrep()
 * below, and Dashboard.tsx for the only place that door is offered.
 */
type Page = 'dashboard' | 'workspace';
type WorkspaceView = 'overview' | 'reader';

export default function App() {
  const status = useVault((s) => s.status);
  const error = useVault((s) => s.error);
  const restore = useVault((s) => s.restore);
  const refresh = useVault((s) => s.refresh);

  const loadProgress = useProgress((s) => s.load);
  const progressLoaded = useProgress((s) => s.loaded);
  const state = useProgress((s) => s.state);
  const prepCount = state.preps.length;
  const setActivePrep = useProgress((s) => s.setActivePrep);
  const prepTree = usePrepTree();
  const prep = useActivePrep();
  const preps = usePreps();

  const [page, setPage] = useState<Page>('dashboard');
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>('overview');
  // What Overview is currently showing in its content pane.
  const [selected, setSelected] = useState<string | null>(null);
  // The PDF the timer is actually running against - deliberately its own
  // state, not derived from `selected`. Peeking at a recording or a slide
  // deck while a PDF session runs changes what's previewed without touching
  // this, so the session survives the peek; only opening a different PDF, or
  // ending the sitting outright, changes it. See openFile below.
  const [openPdf, setOpenPdf] = useState<string | null>(null);

  const today = studyDay(new Date());
  // The workspace header answers for the prep you're inside, not the account -
  // the same reason NotesPanel and the file tree are scoped, one level up.
  const prepSummary = useMemo(
    () => (prep === null ? null : summarise(state, prep.id, today)),
    [state, prep, today],
  );

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

  // The timer runs for as long as a PDF is open - not for as long as the
  // reader is the visible view specifically. Staying inside the prep but
  // switching from Reader to Overview is not the end of a sitting; leaving
  // the prep for the dashboard is - see backToDashboard, which closes the
  // file (via endSession) before it gets here.
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
    // The reader renders PDFs and nothing else. Anything else stays on
    // Overview, where ExternalFile offers to hand it to the app that owns it -
    // and, since it isn't a PDF, it has nothing to do with whatever the timer
    // is currently running against.
    if (isPdf(path)) {
      setOpenPdf(path);
      setWorkspaceView('reader');
    } else {
      setWorkspaceView('overview');
    }
  };

  // Closing the file is what ends the session and raises the save modal.
  const endSession = () => {
    setSelected(null);
    setOpenPdf(null);
    setWorkspaceView('overview');
  };

  const openReader = () => {
    if (openPdf === null) {
      const fallback = firstPdf(prepTree);
      if (fallback === null) return;
      setSelected(fallback);
      setOpenPdf(fallback);
    }
    setWorkspaceView('reader');
  };

  /**
   * The one door into a prep's workspace. Picking a prep and starting today's
   * sitting are the same click: if it already has a PDF, that opens straight
   * into the reader and the timer starts on its own via the openPdf effect
   * above - no separate "select, then open a file" step to remember.
   *
   * Only ever reached from the dashboard (see Dashboard.tsx's onEnterPrep),
   * where backToDashboard has already closed out anything that was open - so
   * there is never a session still running here to preserve.
   */
  const enterPrep = (target: Prep) => {
    setActivePrep(target.id);
    setPage('workspace');
    const scoped = treeForPrep(useVault.getState().tree, target, preps);
    const fallback = firstPdf(scoped);
    setSelected(fallback);
    setOpenPdf(fallback);
    setWorkspaceView(fallback !== null ? 'reader' : 'overview');
  };

  // Leaving the prep, not just stepping out of the reader within it: closes
  // whatever's open exactly like the Reader's own "End session" does, so the
  // save prompt (if the sitting was long enough to log) surfaces on the
  // dashboard rather than leaving a clock quietly running somewhere unseen.
  const backToDashboard = () => {
    endSession();
    setPage('dashboard');
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
          <h1 className="m-0 leading-none">
            <button
              type="button"
              onClick={backToDashboard}
              title="Back to your prep plans"
              className="text-[30px] font-semibold leading-none tracking-[-0.015em] transition-opacity hover:opacity-80"
            >
              PrepOS
            </button>
          </h1>
          <div className="flex items-center gap-[18px]">
            {page === 'workspace' && prep !== null && (
              <div className="tabular hidden items-baseline gap-3 text-[11.5px] text-muted sm:flex">
                <span className="max-w-56 truncate font-semibold text-ink" title={prep.name}>
                  {prep.name}
                </span>
                <PrepActions onDeleted={backToDashboard} />
              </div>
            )}
            <ThemeToggle />
          </div>
        </div>

        <div className="mt-3 h-[3px] bg-ink" />

        {/* Workspace frames its tab row between the thick rule above and a
            thin one below - the pair the header comment describes. The
            dashboard has no tab row to frame - and, since backToDashboard
            always closes out any running session first, never a timer to
            show here either - so it prints only the one rule and stops. */}
        {page === 'workspace' && (
          <>
            <div className="flex items-center justify-between gap-6 py-[7px]">
              <nav className="flex items-center gap-5">
                <button
                  type="button"
                  onClick={() => setWorkspaceView('overview')}
                  className={tab(workspaceView === 'overview')}
                >
                  Overview
                </button>
                <button
                  type="button"
                  onClick={openReader}
                  disabled={!readerReady}
                  title={readerReady ? undefined : 'No PDF in this prep yet'}
                  className={[
                    tab(workspaceView === 'reader'),
                    'disabled:text-muted disabled:no-underline',
                  ].join(' ')}
                >
                  Reader
                </button>
              </nav>

              <div className="flex shrink-0 items-center gap-4">
                {/* The reader draws its own clock at reading size (see
                    ReaderClock in Reader.tsx) - showing this one at the same
                    time would be two clocks, two Pause buttons, for one
                    session. This is the readout for the view the reader
                    doesn't cover. */}
                {workspaceView === 'overview' && <TimerHud />}
                {prepSummary !== null && (
                  <span className="kicker whitespace-nowrap">
                    <span className="tabular">{prepSummary.streak.current}</span> day streak
                  </span>
                )}
              </div>
            </div>

            <div className="h-px bg-ink" />
          </>
        )}
      </header>

      {page === 'dashboard' ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="px-[34px] pb-10 pt-[30px]">
            {error && (
              <p className="mb-6 border-l-2 border-flag px-3 py-2 text-sm text-ink">{error}</p>
            )}
            <Dashboard onEnterPrep={enterPrep} />
          </div>
        </div>
      ) : workspaceView === 'reader' && openPdf !== null ? (
        <Reader
          filePath={openPdf}
          onBackToVault={() => setWorkspaceView('overview')}
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

              <AddFiles />
            </aside>

            <main className="flex min-w-0 flex-col gap-10">
              {error && (
                <p className="border-l-2 border-flag px-3 py-2 text-sm text-ink">{error}</p>
              )}

              <PrepStats />

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

              <CameraRecorder />
            </main>
          </div>
        </div>
      )}

      <QuickNote />
      <SaveSessionModal />
    </div>
  );
}
