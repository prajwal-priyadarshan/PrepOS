import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import './pdfWorker';
import { formatDuration, isCounting, MAX_SESSION_MS } from '@/lib/sessionClock';
import { useProgress } from '@/store/useProgress';
import { useQuickNote } from '@/store/useQuickNote';
import { useSession } from '@/store/useSession';
import { vault } from '@/vault';

interface Props {
  filePath: string;
  /** Back to the dashboard. The file stays open and the clock keeps running. */
  onBackToVault: () => void;
  /** Closes the file, which is what ends the session and raises the save modal. */
  onEndSession: () => void;
}

const PAGE_SAVE_DEBOUNCE_MS = 1000;

/**
 * The clock, at the size the reader gives it.
 *
 * It reads active time rather than wall time, so it stalls when you tab away or
 * go idle - the number is what you actually read for, not how long the window
 * was open.
 */
function ReaderClock() {
  const clock = useSession((s) => s.clock);
  const paused = useSession((s) => s.paused);
  const windowHidden = useSession((s) => s.windowHidden);
  const capNotified = useSession((s) => s.capNotified);
  const togglePause = useSession((s) => s.togglePause);

  const counting = !paused && (clock.external || (!windowHidden && isCounting(clock, Date.now())));

  return (
    <>
      {capNotified && (
        <span className="border-l-2 border-flag px-2.5 py-1 text-[11.5px] text-ink">
          {formatDuration(MAX_SESSION_MS)} in &mdash; take the break.
        </span>
      )}
      <span
        aria-hidden
        title={counting ? 'Counting' : 'Not counting'}
        className={[
          'inline-block size-1.5 rounded-full transition-colors',
          counting ? 'bg-accent' : 'bg-muted',
        ].join(' ')}
      />
      <span className="tabular text-[22px] font-semibold leading-none">
        {formatDuration(clock.activeMs)}
      </span>
      <button
        type="button"
        onClick={togglePause}
        title="Pause or resume (t)"
        className="rounded-sm border border-divider px-[15px] py-2 text-[13.5px] transition-colors hover:bg-tint"
      >
        {paused ? 'Resume' : 'Pause'}
      </button>
    </>
  );
}

export function Reader({ filePath, onBackToVault, onEndSession }: Props) {
  const savedPage = useProgress((s) => s.state.lastPage[filePath]);
  const setLastPage = useProgress((s) => s.setLastPage);
  const showQuickNote = useQuickNote((s) => s.show);

  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [page, setPage] = useState(savedPage ?? 1);
  const [showText, setShowText] = useState(false);
  const [width, setWidth] = useState(720);

  const frameRef = useRef<HTMLDivElement | null>(null);

  // Load once per file. Bytes rather than the asset protocol: pdf.js takes raw
  // bytes happily and wiring convertFileSrc's scope for arbitrary user paths is
  // fiddly for no gain.
  useEffect(() => {
    let cancelled = false;
    setBytes(null);
    setLoadError(null);
    setPageCount(0);
    vault
      .readFile(filePath)
      .then((data) => {
        if (!cancelled) setBytes(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [filePath]);

  // Reset to the remembered page whenever the file changes.
  useEffect(() => {
    setPage(savedPage ?? 1);
  }, [savedPage]);

  /**
   * A fresh copy per load: pdf.js transfers the buffer it is given, detaching
   * it. Reusing the original on a remount would hand over an empty buffer.
   * Memoised so a re-render does not re-copy 20MB or restart the document.
   */
  const file = useMemo(() => (bytes ? { data: new Uint8Array(bytes) } : null), [bytes]);

  // Fit the page to the mat, less its 26px padding on both sides.
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.max(320, Math.floor(entry.contentRect.width - 52)));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const go = useCallback(
    (delta: number) => {
      setPage((current) => {
        const next = current + delta;
        if (next < 1 || (pageCount > 0 && next > pageCount)) return current;
        return next;
      });
    },
    [pageCount],
  );

  // Debounced so paging quickly through a chapter writes once, not forty times.
  useEffect(() => {
    if (pageCount === 0) return;
    const id = setTimeout(() => setLastPage(filePath, page), PAGE_SAVE_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [filePath, page, pageCount, setLastPage]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'Escape') {
        // The quick-note sheet owns Escape while it is up; navigating away
        // underneath it would strand the note it is about.
        if (useQuickNote.getState().open) return;
        // Back to the dashboard, not out of the session - Escape is the cheap
        // key, and ending a sitting is not a cheap action.
        onBackToVault();
      } else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, onBackToVault]);

  return (
    <div className="flex min-h-0 flex-1 flex-col px-[34px] pb-[34px] pt-[22px]">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-[18px] gap-y-3">
        <div className="flex min-w-0 items-baseline gap-4">
          <button
            type="button"
            onClick={onBackToVault}
            title="Back to the dashboard (Esc). The clock keeps running."
            className="shrink-0 text-[13.5px] text-accent transition-opacity hover:opacity-70"
          >
            &larr; Vault
          </button>
          <span className="tabular truncate text-[13px]" title={filePath}>
            {filePath.split('/').at(-1)}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-[18px]">
          <button
            type="button"
            onClick={() => setShowText((v) => !v)}
            title="Toggle the selectable text layer"
            className={[
              'rounded-sm px-2 py-1 text-[13px] transition-colors',
              showText ? 'bg-tint text-accent' : 'text-muted hover:bg-tint',
            ].join(' ')}
          >
            Text
          </button>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => go(-1)}
              disabled={page <= 1}
              title="Previous page (←)"
              className="rounded-sm px-1.5 py-1 text-[13px] text-muted transition-colors hover:bg-tint disabled:opacity-30"
            >
              &larr;
            </button>
            <span className="tabular min-w-[92px] text-center text-[13px] text-muted">
              page {page} / {pageCount || '–'}
            </span>
            <button
              type="button"
              onClick={() => go(1)}
              disabled={pageCount > 0 && page >= pageCount}
              title="Next page (→)"
              className="rounded-sm px-1.5 py-1 text-[13px] text-muted transition-colors hover:bg-tint disabled:opacity-30"
            >
              &rarr;
            </button>
          </div>

          <ReaderClock />
        </div>
      </div>

      {/* The mat: the one filled surface in the app, and the reason the page
          itself reads as a sheet of paper laid on it rather than as a panel. */}
      <div ref={frameRef} className="mt-5 min-h-0 flex-1 overflow-auto bg-surface p-[26px]">
        {loadError && (
          <p className="mx-auto max-w-md border-l-2 border-flag px-3 py-2 text-sm">{loadError}</p>
        )}

        {file && (
          <Document
            file={file}
            onLoadSuccess={({ numPages }) => setPageCount(numPages)}
            onLoadError={(err) => setLoadError(err.message)}
            loading={<p className="text-sm text-muted">Loading&hellip;</p>}
            error={<p className="text-sm text-flag">Could not render this PDF.</p>}
            className="flex justify-center"
          >
            <Page
              pageNumber={page}
              width={width}
              renderTextLayer={showText}
              renderAnnotationLayer={false}
              className="border border-divider"
            />
            {/* Neighbours rendered offscreen so paging feels instant. Never all
                pages - a 400-page quant book would freeze the window. */}
            <div className="hidden">
              {page > 1 && (
                <Page
                  pageNumber={page - 1}
                  width={width}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
              )}
              {pageCount > page && (
                <Page
                  pageNumber={page + 1}
                  width={width}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
              )}
            </div>
          </Document>
        )}
      </div>

      <div className="mt-[18px] flex shrink-0 items-center justify-between gap-4">
        {/* The kicker's type role, spelled out rather than taken from the
            utility: this is the one kicker in the app that is interactive, and
            it needs a hover colour the utility's own colour would fight. */}
        <button
          type="button"
          onClick={showQuickNote}
          className="text-[10px] uppercase leading-[1.4] tracking-[0.12em] text-muted transition-colors hover:text-accent"
        >
          Press n to note this page
        </button>
        <button
          type="button"
          onClick={onEndSession}
          title="Close the file and log this sitting"
          className="rounded-sm bg-accent px-[15px] py-2 text-[13.5px] text-on-accent transition-opacity hover:opacity-90"
        >
          End session
        </button>
      </div>
    </div>
  );
}
