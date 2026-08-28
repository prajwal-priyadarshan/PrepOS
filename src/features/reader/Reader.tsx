import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import './pdfWorker';
import { useProgress } from '@/store/useProgress';
import { useQuickNote } from '@/store/useQuickNote';
import { vault } from '@/vault';

interface Props {
  filePath: string;
  onClose: () => void;
}

const PAGE_SAVE_DEBOUNCE_MS = 1000;

export function Reader({ filePath, onClose }: Props) {
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

  // Fit the page to the frame.
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.max(320, Math.floor(entry.contentRect.width - 48)));
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
        // The quick-note sheet owns Escape while it is up; closing the file
        // underneath it would end the session the note is about.
        if (useQuickNote.getState().open) return;
        onClose();
      } else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, onClose]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-graphite/20 px-4 py-2">
        <p className="truncate text-sm" title={filePath}>
          {filePath.split('/').at(-1)}
        </p>
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={showQuickNote}
            title="Note on this page (n)"
            className="rounded px-2 py-1 text-xs text-graphite hover:bg-graphite/10"
          >
            Note
          </button>
          <button
            type="button"
            onClick={() => setShowText((v) => !v)}
            title="Toggle selectable text layer"
            className={[
              'rounded px-2 py-1 text-xs transition-colors',
              showText ? 'bg-ink text-paper' : 'text-graphite hover:bg-graphite/10',
            ].join(' ')}
          >
            Text
          </button>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => go(-1)}
              disabled={page <= 1}
              className="rounded px-2 py-1 text-xs text-graphite hover:bg-graphite/10 disabled:opacity-30"
            >
              &larr;
            </button>
            <span className="tabular min-w-24 text-center text-xs">
              {page} / {pageCount || '\u2013'}
            </span>
            <button
              type="button"
              onClick={() => go(1)}
              disabled={pageCount > 0 && page >= pageCount}
              className="rounded px-2 py-1 text-xs text-graphite hover:bg-graphite/10 disabled:opacity-30"
            >
              &rarr;
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close (Esc)"
            className="rounded px-2 py-1 text-xs text-graphite hover:bg-graphite/10"
          >
            Close
          </button>
        </div>
      </div>

      <div ref={frameRef} className="min-h-0 flex-1 overflow-auto bg-graphite/10 p-6">
        {loadError && (
          <p className="mx-auto max-w-md rounded border-l-2 border-flag bg-flag/5 px-3 py-2 text-sm">
            {loadError}
          </p>
        )}

        {file && (
          <Document
            file={file}
            onLoadSuccess={({ numPages }) => setPageCount(numPages)}
            onLoadError={(err) => setLoadError(err.message)}
            loading={<p className="text-sm text-graphite">Loading&hellip;</p>}
            error={<p className="text-sm text-flag">Could not render this PDF.</p>}
            className="flex justify-center"
          >
            <Page
              pageNumber={page}
              width={width}
              renderTextLayer={showText}
              renderAnnotationLayer={false}
              className="shadow-sm"
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
    </div>
  );
}
