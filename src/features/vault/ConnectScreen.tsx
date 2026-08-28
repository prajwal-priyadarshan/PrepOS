import { daysToExam, EXAM_DAY } from '@/lib/exam';
import { useVault } from '@/store/useVault';

export function ConnectScreen() {
  const connect = useVault((s) => s.connect);
  const status = useVault((s) => s.status);
  const error = useVault((s) => s.error);
  const remaining = daysToExam();

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-6 text-ink">
      <div className="w-full max-w-md">
        <h1 className="font-display text-3xl font-semibold tracking-tight">PrepOS</h1>
        <p className="mt-3 text-sm leading-relaxed text-graphite">
          Point this at the folder your CAT material lives in. It reads whatever is already there
          &mdash; nothing is moved or renamed. Everything it records goes into{' '}
          <span className="tabular">.catprep/state.json</span> inside that same folder, so the
          folder is the backup.
        </p>

        <button
          type="button"
          onClick={connect}
          disabled={status === 'connecting'}
          className="mt-7 w-full rounded-md bg-ink px-4 py-3 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {status === 'connecting' ? 'Waiting for folder\u2026' : 'Choose vault folder'}
        </button>

        {error && (
          <p className="mt-4 rounded border-l-2 border-flag bg-flag/5 px-3 py-2 text-sm text-ink">
            {error}
          </p>
        )}

        <p className="mt-8 border-t border-graphite/20 pt-4 text-xs text-graphite">
          <span className="tabular">{remaining}</span> days to CAT &middot;{' '}
          <span className="tabular">{EXAM_DAY}</span>
        </p>
      </div>
    </main>
  );
}
