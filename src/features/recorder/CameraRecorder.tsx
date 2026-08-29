import { useEffect, useRef, useState } from 'react';
import { newId, type Recording } from '@/lib/model';
import { formatDuration } from '@/lib/sessionClock';
import { studyDay } from '@/lib/studyDay';
import { useProgress } from '@/store/useProgress';
import { useVault } from '@/store/useVault';
import { type AppendHandle, joinPath, vault } from '@/vault';
import { useActivePrep } from '../preps/usePreps';

/**
 * Tauri 2.11.5 does not expose Builder::on_permission_request (it exists only on
 * tauri's dev branch), and wry's default WebView2 permission handler auto-allows
 * clipboard alone. src-tauri/src/lib.rs installs its own PermissionRequested
 * handler via with_webview() + webview2-com to grant camera and microphone
 * without asking, so this only ever prompts on platforms other than Windows.
 */
const CANDIDATE_MIME_TYPES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
];

/** Where a prep's self-recordings live - a section like any other, but one the
 *  app makes rather than asks for. */
const RECORDINGS_DIR = 'Recordings';

type Phase =
  | { kind: 'idle' }
  | { kind: 'previewing' }
  | { kind: 'recording' }
  | { kind: 'saving' }
  | { kind: 'error'; message: string };

function pickMimeType(): string | null {
  return CANDIDATE_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

function slug(text: string): string {
  const cleaned = text
    .trim()
    .replace(/[^A-Za-z0-9 _-]/g, '')
    .replace(/ +/g, '-')
    .slice(0, 40);
  return cleaned.length > 0 ? cleaned : 'recording';
}

/** Resolves once every queued chunk has actually reached the handle. */
function stopAndDrain(recorder: MediaRecorder, pending: Promise<void>[]): Promise<void> {
  return new Promise((resolve) => {
    recorder.addEventListener(
      'stop',
      () => {
        void Promise.all(pending).then(() => resolve());
      },
      { once: true },
    );
    recorder.stop();
  });
}

/**
 * Optional, per prep: a daily "say it out loud" recording - an intro, a
 * mock-interview answer, a speaking-section run - saved straight into that
 * prep's own folder rather than to some app-wide gallery.
 *
 * Streamed to disk in one-second chunks through vault.openAppend rather than
 * assembled in memory and written once at the end: a five-minute take is tens
 * of megabytes of video the tab would otherwise be holding onto for no reason,
 * and a crash mid-recording loses only the last second instead of the take.
 */
export function CameraRecorder() {
  const prep = useActivePrep();
  const addRecording = useProgress((s) => s.addRecording);
  const ensureFolder = useVault((s) => s.ensureFolder);
  const refreshVault = useVault((s) => s.refresh);

  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [topic, setTopic] = useState('');
  const [elapsed, setElapsed] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const handleRef = useRef<AppendHandle | null>(null);
  const writesRef = useRef<Promise<void>[]>([]);
  const startedAtRef = useRef<number>(0);
  const tickRef = useRef<number | null>(null);
  // Stashed here rather than left in React state - finish() reads them well
  // after the phase (and any re-render) has moved on.
  const pathRef = useRef('');
  const topicRef = useRef('Recording');

  const stopTracks = () => {
    for (const track of streamRef.current?.getTracks() ?? []) track.stop();
    streamRef.current = null;
  };

  // A live camera left running after the panel unmounts is both a privacy
  // problem and a locked device on the next attempt. Inlined rather than
  // calling stopTracks(): a fresh function identity every render would
  // otherwise be a dependency this effect has no real reason to rerun for.
  useEffect(() => {
    return () => {
      for (const track of streamRef.current?.getTracks() ?? []) track.stop();
      if (tickRef.current !== null) window.clearInterval(tickRef.current);
    };
  }, []);

  async function openPreview() {
    setPhase({ kind: 'previewing' });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
    } catch (err) {
      const e = err as DOMException;
      setPhase({ kind: 'error', message: e.message || String(err) });
    }
  }

  function cancelPreview() {
    stopTracks();
    setPhase({ kind: 'idle' });
  }

  async function start() {
    if (prep === null || streamRef.current === null) return;
    const mimeType = pickMimeType();
    if (mimeType === null) {
      setPhase({ kind: 'error', message: 'No supported video codec on this device.' });
      return;
    }

    const dir = joinPath(prep.folder, RECORDINGS_DIR);
    if (!(await ensureFolder(dir))) return;

    const name = `${studyDay(new Date())} ${slug(topic || 'recording')}.webm`;
    const path = joinPath(dir, name);
    const handle = await vault.openAppend(path);
    handleRef.current = handle;
    writesRef.current = [];

    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    recorder.ondataavailable = (event) => {
      if (event.data.size === 0) return;
      const write = event.data.arrayBuffer().then((buffer) => handle.write(new Uint8Array(buffer)));
      writesRef.current.push(write);
    };
    recorderRef.current = recorder;
    recorder.start(1000);

    startedAtRef.current = Date.now();
    setElapsed(0);
    tickRef.current = window.setInterval(() => {
      setElapsed(Math.round((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    setPhase({ kind: 'recording' });

    pathRef.current = path;
    topicRef.current = topic.trim() || 'Recording';
  }

  async function finish(discard: boolean) {
    const recorder = recorderRef.current;
    const handle = handleRef.current;
    if (recorder === null || handle === null) return;

    if (tickRef.current !== null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    setPhase({ kind: 'saving' });

    await stopAndDrain(recorder, writesRef.current);
    await handle.close();
    recorderRef.current = null;
    handleRef.current = null;

    const durationSeconds = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));

    if (discard || prep === null) {
      // A discarded take is still bytes on disk - only the ledger entry is
      // skipped, which is enough to keep it out of stats without a delete
      // path that could take real footage with it by mistake.
      stopTracks();
      await refreshVault();
      setPhase({ kind: 'idle' });
      return;
    }

    const recording: Recording = {
      id: newId(),
      prepId: prep.id,
      studyDay: studyDay(new Date(startedAtRef.current)),
      filePath: pathRef.current,
      topic: topicRef.current,
      durationSeconds,
    };
    addRecording(recording);

    stopTracks();
    await refreshVault();
    setTopic('');
    setPhase({ kind: 'idle' });
  }

  if (prep === null) return null;

  return (
    <section>
      <div className="flex items-start justify-between gap-[30px]">
        <div>
          <h3 className="m-0 mb-1.5 text-lg font-semibold">Record yourself</h3>
          <p className="m-0 max-w-[62ch] text-[13.5px] leading-[1.55] text-soft">
            An intro, a speaking-section answer, a daily run-through &mdash; saved straight into{' '}
            {prep.name}'s own folder, not somewhere else you'd have to go find it.
          </p>
        </div>
        {phase.kind === 'idle' && (
          <button
            type="button"
            onClick={openPreview}
            className="shrink-0 rounded-sm border border-divider px-[15px] py-2 text-[13.5px] transition-colors hover:bg-tint"
          >
            Start camera
          </button>
        )}
      </div>

      {(phase.kind === 'previewing' || phase.kind === 'recording' || phase.kind === 'saving') && (
        <div className="mt-4">
          <video
            ref={videoRef}
            muted
            playsInline
            className="w-full max-w-xs rounded-sm border border-divider bg-surface"
          />

          {phase.kind === 'previewing' && (
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <label htmlFor="recording-topic" className="sr-only">
                What is this recording
              </label>
              <input
                id="recording-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Daily check-in"
                className="min-w-0 flex-1 rounded-sm border border-divider bg-surface px-[13px] py-2 text-sm"
              />
              <button
                type="button"
                onClick={start}
                className="shrink-0 rounded-sm bg-accent px-[15px] py-2 text-[13.5px] text-on-accent transition-opacity hover:opacity-90"
              >
                Start recording
              </button>
              <button
                type="button"
                onClick={cancelPreview}
                className="shrink-0 text-[13.5px] text-muted transition-colors hover:text-accent"
              >
                Cancel
              </button>
            </div>
          )}

          {phase.kind === 'recording' && (
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-2 text-[13.5px]">
                <span aria-hidden className="inline-block size-1.5 rounded-full bg-flag" />
                <span className="tabular">{formatDuration(elapsed * 1000)}</span>
              </span>
              <button
                type="button"
                onClick={() => void finish(false)}
                className="rounded-sm bg-accent px-[15px] py-2 text-[13.5px] text-on-accent transition-opacity hover:opacity-90"
              >
                Stop and save
              </button>
              <button
                type="button"
                onClick={() => void finish(true)}
                className="text-[13.5px] text-muted transition-colors hover:text-flag"
              >
                Discard
              </button>
            </div>
          )}

          {phase.kind === 'saving' && (
            <p className="mt-3 text-[13.5px] text-muted">Saving&hellip;</p>
          )}
        </div>
      )}

      {phase.kind === 'error' && (
        <div className="mt-4 border-l-2 border-flag px-3 py-2">
          <p className="m-0 text-[13.5px]">{phase.message}</p>
          <p className="m-0 mt-2 text-[13.5px] text-muted">
            Check Windows Settings &rsaquo; Privacy &amp; security &rsaquo; Camera (and Microphone)
            and make sure desktop apps are allowed access.
          </p>
          <button
            type="button"
            onClick={() => setPhase({ kind: 'idle' })}
            className="mt-2 text-[13.5px] text-accent transition-opacity hover:opacity-70"
          >
            Dismiss
          </button>
        </div>
      )}
    </section>
  );
}
