import { useEffect, useRef, useState } from 'react';

/**
 * Preflight for the recorder, not the recorder itself.
 *
 * Tauri 2.11.5 does not expose Builder::on_permission_request (it exists only on
 * tauri's dev branch), and wry's default WebView2 permission handler auto-allows
 * clipboard alone. src-tauri/src/lib.rs installs its own PermissionRequested
 * handler via with_webview() + webview2-com to grant camera and microphone
 * without asking, so this only ever prompts on platforms other than Windows.
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
    <section>
      <div className="flex items-start justify-between gap-[30px]">
        <div>
          <h3 className="m-0 mb-1.5 text-lg font-semibold">Camera check</h3>
          <p className="m-0 max-w-[62ch] text-[13.5px] leading-[1.55] text-soft">
            Confirms your camera and microphone are ready before you record a session.
          </p>
        </div>
        <div className="flex shrink-0 gap-3">
          {result.kind === 'ok' && (
            <button
              type="button"
              onClick={stop}
              className="text-[13.5px] text-muted transition-colors hover:text-accent"
            >
              Stop
            </button>
          )}
          <button
            type="button"
            onClick={run}
            disabled={result.kind === 'testing'}
            className="rounded-sm border border-divider px-[15px] py-2 text-[13.5px] transition-colors hover:bg-tint disabled:opacity-50"
          >
            {result.kind === 'testing' ? 'Asking\u2026' : 'Test camera'}
          </button>
        </div>
      </div>

      {result.kind === 'ok' && (
        <div className="mt-4">
          <p className="m-0 text-[13.5px] text-soft">
            Camera and microphone available. {result.video} &middot; {result.audio}
          </p>
          <p className="tabular mt-1.5 text-[11.5px] text-muted">
            {result.codecs.length > 0
              ? `codecs: ${result.codecs.join('  ')}`
              : 'no webm codec supported \u2014 recorder would need a different container'}
          </p>
          <video
            ref={videoRef}
            muted
            playsInline
            className="mt-4 w-full max-w-xs rounded-sm border border-divider bg-surface"
          />
        </div>
      )}

      {result.kind === 'fail' && (
        <div className="mt-4 border-l-2 border-flag px-3 py-2">
          <p className="m-0 text-[13.5px]">
            Blocked: <span className="tabular">{result.name}</span>
          </p>
          <p className="m-0 mt-1.5 text-[13.5px] text-soft">{result.message}</p>
          <p className="m-0 mt-2 text-[13.5px] text-muted">
            Check Windows Settings &rsaquo; Privacy &amp; security &rsaquo; Camera (and Microphone)
            and make sure desktop apps are allowed access.
          </p>
        </div>
      )}
    </section>
  );
}
