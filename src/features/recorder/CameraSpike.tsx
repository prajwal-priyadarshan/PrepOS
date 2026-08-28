import { useEffect, useRef, useState } from 'react';

/**
 * M1 spike, not the recorder.
 *
 * Tauri 2.11.5 does not expose Builder::on_permission_request (it exists only on
 * tauri's dev branch), and wry's default WebView2 permission handler auto-allows
 * clipboard alone. So whether getUserMedia works here is an open question that
 * must be answered before the recorder is built on top of it, not after.
 *
 * If this fails, the fallback is a PermissionRequested handler installed through
 * with_webview() + the webview2-com crate.
 */

type Result =
  | { kind: 'idle' }
  | { kind: 'testing' }
  | { kind: 'ok'; video: string; audio: string; codecs: string[] }
  | { kind: 'fail'; name: string; message: string };

const CANDIDATE_CODECS = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];

export function CameraSpike() {
  const [result, setResult] = useState<Result>({ kind: 'idle' });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // A live camera left running after the panel closes is both a privacy problem
  // and a locked device on the next attempt.
  useEffect(() => {
    return () => {
      for (const track of streamRef.current?.getTracks() ?? []) track.stop();
    };
  }, []);

  async function run() {
    setResult({ kind: 'testing' });
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
      setResult({
        kind: 'ok',
        video: stream.getVideoTracks()[0]?.label ?? '(unnamed camera)',
        audio: stream.getAudioTracks()[0]?.label ?? '(unnamed microphone)',
        codecs: CANDIDATE_CODECS.filter((c) => MediaRecorder.isTypeSupported(c)),
      });
    } catch (err) {
      const e = err as DOMException;
      setResult({ kind: 'fail', name: e.name ?? 'Error', message: e.message ?? String(err) });
    }
  }

  function stop() {
    for (const track of streamRef.current?.getTracks() ?? []) track.stop();
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setResult({ kind: 'idle' });
  }

  return (
    <section className="rounded-md border border-graphite/20 bg-surface p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-sm font-semibold">Camera check</h2>
          <p className="mt-0.5 text-xs text-graphite">
            Answers whether the recorder is buildable, before M6 depends on it.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={run}
            disabled={result.kind === 'testing'}
            className="rounded border border-ink px-3 py-1.5 text-xs font-medium transition-colors hover:bg-ink hover:text-paper disabled:opacity-50"
          >
            {result.kind === 'testing' ? 'Asking\u2026' : 'Test camera'}
          </button>
          {result.kind === 'ok' && (
            <button
              type="button"
              onClick={stop}
              className="rounded border border-graphite/40 px-3 py-1.5 text-xs text-graphite transition-colors hover:bg-graphite/10"
            >
              Stop
            </button>
          )}
        </div>
      </div>

      {result.kind === 'ok' && (
        <div className="mt-3">
          <p className="text-xs text-graphite">
            <span className="font-medium text-ink">Camera and microphone available.</span>{' '}
            {result.video} &middot; {result.audio}
          </p>
          <p className="tabular mt-1 text-[11px] text-graphite">
            {result.codecs.length > 0
              ? `codecs: ${result.codecs.join('  ')}`
              : 'no webm codec supported \u2014 recorder would need a different container'}
          </p>
          <video
            ref={videoRef}
            muted
            playsInline
            className="mt-3 w-full max-w-xs rounded border border-graphite/20 bg-ink"
          />
        </div>
      )}

      {result.kind === 'fail' && (
        <div className="mt-3 rounded border-l-2 border-flag bg-flag/5 px-3 py-2">
          <p className="text-xs font-medium text-ink">
            Blocked: <span className="tabular">{result.name}</span>
          </p>
          <p className="mt-1 text-xs text-graphite">{result.message}</p>
          <p className="mt-2 text-xs text-graphite">
            Fallback: install a PermissionRequested handler via with_webview() and the webview2-com
            crate.
          </p>
        </div>
      )}
    </section>
  );
}
