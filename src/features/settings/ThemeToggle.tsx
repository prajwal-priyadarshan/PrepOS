import type { MouseEvent } from 'react';
import { nextTheme, type Theme, themeLabel } from '@/lib/theme';
import { maxRadius } from '@/lib/viewTransition';
import { useTheme } from '@/store/useTheme';

/** Long enough to read as a sweep, short enough that the button still feels
 *  instant rather than like it is waiting on something. */
const REVEAL_MS = 550;

/**
 * The new theme grows in from wherever the button was, rather than the whole
 * page just changing colour at once - a click has a location, and the switch
 * reads as caused by it instead of as a global flicker.
 *
 * Feature-detected, not polyfilled: startViewTransition is Chromium-only for
 * now (fine - this ships inside a WebView2 shell), and reduced-motion turns
 * it off entirely rather than swapping in a smaller animation, because the
 * request there is no motion, not less of it.
 */
function switchTheme(event: MouseEvent<HTMLButtonElement>, cycle: () => void) {
  const supported = typeof document.startViewTransition === 'function';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!supported || reduceMotion) {
    cycle();
    return;
  }

  const x = event.clientX;
  const y = event.clientY;
  const radius = maxRadius(x, y, window.innerWidth, window.innerHeight);

  const transition = document.startViewTransition(() => cycle());
  void transition.ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: REVEAL_MS, easing: 'ease-in-out', pseudoElement: '::view-transition-new(root)' },
    );
  });
}

/**
 * One button that cycles, not a control per theme.
 *
 * Three named buttons would be three-quarters of an inch of chrome sitting in
 * the masthead permanently, to serve a setting most people touch twice. A
 * single glyph spends the space it earns and hands the rest back to the page.
 *
 * The glyph is the theme in force, not the one a click would land on: with two
 * states those read the same, but with three, a picture of the next state is a
 * riddle. The accessible name carries the direction instead, so the click is
 * still predictable without having to be guessed from an icon.
 */
export function ThemeToggle() {
  const theme = useTheme((s) => s.theme);
  const cycle = useTheme((s) => s.cycle);

  return (
    <button
      type="button"
      onClick={(e) => switchTheme(e, cycle)}
      title={`Theme: ${themeLabel(theme)}`}
      aria-label={`Theme: ${themeLabel(theme)}. Switch to ${themeLabel(nextTheme(theme))}.`}
      className="flex shrink-0 items-center justify-center rounded-sm border border-divider p-1.5 text-muted transition-colors hover:bg-tint hover:text-ink"
    >
      <ThemeIcon theme={theme} />
    </button>
  );
}

/**
 * Sun, crescent, filled crescent - drawn inline rather than pulled from an
 * icon set, because three glyphs is not worth a dependency and currentColor
 * keeps them on the same ink as everything else in the rail.
 *
 * Decorative: the button already carries the name, and an icon that announced
 * itself as well would say the theme twice.
 */
function ThemeIcon({ theme }: { theme: Theme }) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <ThemeGlyph theme={theme} />
    </svg>
  );
}

function ThemeGlyph({ theme }: { theme: Theme }) {
  if (theme === 'light') {
    return (
      <>
        <circle cx="8" cy="8" r="3.1" />
        <path d="M8 1.4v1.4M8 13.2v1.4M14.6 8h-1.4M2.8 8H1.4M12.66 3.34l-1 1M4.34 11.66l-1 1M12.66 12.66l-1-1M4.34 4.34l-1-1" />
      </>
    );
  }

  if (theme === 'dark') {
    return <path d="M14 8.53A6 6 0 1 1 7.47 2 4.67 4.67 0 0 0 14 8.53z" />;
  }

  // Black: the same crescent as Dark, filled solid rather than outlined - one
  // press further into the same shape, not a different glyph to learn.
  return (
    <path
      d="M14 8.53A6 6 0 1 1 7.47 2 4.67 4.67 0 0 0 14 8.53z"
      fill="currentColor"
      stroke="none"
    />
  );
}
