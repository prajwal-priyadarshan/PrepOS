import type { ReactNode } from 'react';
import { studyDay } from '@/lib/studyDay';
import { useVault } from '@/store/useVault';
import { STATE_PATH } from '@/vault';
import { ThemeToggle } from '../settings/ThemeToggle';

/**
 * The front page, before there is anything to report.
 *
 * It prints the same masthead furniture the dashboard does - name, dateline
 * rail, thick-thin rule pair - so the window is recognisably the same app the
 * moment it opens. Below that rule, though, there is nothing to report yet: no
 * streak, no heatmap, no pages read. That's the one moment PrepOS has an
 * audience that doesn't already know what it does, so this screen spends it
 * explaining - a short pitch and the four things it actually tracks - before
 * asking for a folder.
 */
export function ConnectScreen() {
  const connect = useVault((s) => s.connect);
  const status = useVault((s) => s.status);
  const error = useVault((s) => s.error);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-paper px-6 py-16 text-ink">
      {/* Two soft accent glows, fixed to the viewport rather than the card,
          so the hero reads as lit from behind instead of boxed in. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -left-32 h-[520px] w-[520px] rounded-full opacity-40 blur-3xl"
        style={{ background: 'radial-gradient(closest-side, var(--color-accent), transparent)' }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 top-1/3 h-[420px] w-[420px] rounded-full opacity-25 blur-3xl"
        style={{ background: 'radial-gradient(closest-side, var(--color-accent), transparent)' }}
      />

      <div className="relative w-full max-w-2xl">
        <div className="flex items-end justify-between gap-6">
          <h1 className="m-0 text-[30px] font-semibold leading-none tracking-[-0.015em]">PrepOS</h1>
          <div className="flex items-center gap-[18px]">
            <span className="tabular hidden text-[11.5px] text-muted sm:inline">
              {studyDay(new Date())}
            </span>
            <ThemeToggle />
          </div>
        </div>

        <div className="mt-3 h-[3px] bg-ink" />
        <div className="flex items-center justify-between py-[7px]">
          <span className="kicker">No vault yet</span>
        </div>
        <div className="h-px bg-ink" />

        {/* The pitch. */}
        <p className="mt-10 max-w-[46ch] text-[26px] font-semibold leading-[1.2] tracking-[-0.01em] [text-wrap:pretty]">
          A study companion for the pile of PDFs you already have.
        </p>
        <p className="mt-4 max-w-[58ch] text-[14.5px] leading-[1.6] text-soft [text-wrap:pretty]">
          Open a PDF, read, close it &mdash; that's the whole habit. PrepOS times the reading, logs
          it against the exact file and page, and turns that into streaks and a study heatmap for
          free. Nothing is uploaded anywhere; there's no account and no server.
        </p>

        {/* What it actually tracks - the part a blank first screen usually
            leaves you to discover by clicking around. */}
        <div className="mt-9 grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
          <Feature icon={<ClockIcon />} title="A timer that knows you're reading">
            Starts itself when you open a PDF, pauses when you tab away or go idle. Logged time is
            active reading, not window-left-open.
          </Feature>
          <Feature icon={<FlameIcon />} title="Streaks, with a weekly freeze">
            A GitHub-style heatmap of a year showing up, plus one freeze a week for the days that
            don't go to plan.
          </Feature>
          <Feature icon={<FolderIcon />} title="Your own vault, plain files">
            Point it at a folder &mdash; local or synced, empty or already full &mdash; and that's
            the whole vault. Nothing is moved, renamed, or hidden from Explorer.
          </Feature>
          <Feature icon={<PinIcon />} title="Notes pinned to the page">
            Press <kbd className="rounded-sm border border-divider px-1 py-px text-[11px]">n</kbd>{' '}
            anywhere in the reader to drop a note against the exact page you're on.
          </Feature>
        </div>

        <button
          type="button"
          onClick={connect}
          disabled={status === 'connecting'}
          className="mt-10 rounded-sm bg-accent px-[18px] py-3 text-[13.5px] font-medium text-on-accent shadow-[0_8px_24px_-8px_var(--color-accent)] transition-opacity hover:opacity-90 disabled:opacity-50 disabled:shadow-none"
        >
          {status === 'connecting' ? 'Waiting for folder…' : 'Choose vault folder'}
        </button>

        {error && <p className="mt-5 border-l-2 border-flag px-3 py-2 text-[13.5px]">{error}</p>}

        <p className="mt-6 max-w-[58ch] text-[12.5px] leading-[1.6] text-muted">
          A brand-new empty folder works fine &mdash; there's nothing to set up first, you can add
          PDFs from inside the app afterwards. Everything it records goes into{' '}
          <span className="tabular">{STATE_PATH}</span> inside that same folder, so the folder is
          the backup &mdash; and you choose the preps and their deadlines next.
        </p>
      </div>
    </main>
  );
}

/** One tile in the feature grid: a small accent-tinted glyph well, a title,
 *  and a line of copy - the same shape four times so the eye can scan it as
 *  a list rather than read each one as its own paragraph. */
function Feature({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3.5">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-tint text-accent">
        {icon}
      </div>
      <div>
        <p className="m-0 text-[13.5px] font-semibold leading-tight text-ink">{title}</p>
        <p className="mt-1.5 text-[13px] leading-[1.55] text-muted [text-wrap:pretty]">
          {children}
        </p>
      </div>
    </div>
  );
}

/** Feature glyphs, drawn inline in the same stroke style as ThemeToggle's -
 *  currentColor, round caps, no icon-set dependency for four one-off shapes. */
function iconProps() {
  return {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
}

function ClockIcon() {
  return (
    <svg {...iconProps()} aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

function FlameIcon() {
  return (
    <svg {...iconProps()} aria-hidden="true" focusable="false">
      <path d="M12 3c1 3-3 4-3 7.5a3 3 0 0 0 6 0c0-1.4-.7-2.1-1.2-2.9-.3.9.1 1.6-.5 2.1C12.6 8.3 12 6.2 12 3Z" />
      <path d="M8.5 12c-1 1.6-1.5 2.9-1.5 4.2A5 5 0 0 0 12 21a5 5 0 0 0 5-4.8c0-1.9-.9-3.2-1.8-4.4.1 2.6-1.4 3.7-2.3 4.4-.6.5-1 1-.9 1.8" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg {...iconProps()} aria-hidden="true" focusable="false">
      <path d="M3.5 6.5A1.5 1.5 0 0 1 5 5h4l2 2.2h8a1.5 1.5 0 0 1 1.5 1.5v8.8A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5Z" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg {...iconProps()} aria-hidden="true" focusable="false">
      <path d="M12 3.5 8 7l-3.5 1L8 11.5 3 17l5.5-5L12 15.5l1-3.5 3.5-4-4-4Z" />
      <path d="M9 15 4 20" />
    </svg>
  );
}
