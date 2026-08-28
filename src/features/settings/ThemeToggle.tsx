import { themeLabel } from '@/lib/theme';
import { useTheme } from '@/store/useTheme';

const GLYPH = { system: '\u25D0', light: '\u2600', dark: '\u263E' } as const;

/**
 * One control, three states, cycled in place.
 *
 * A three-way segmented control would cost header width that the timer and the
 * counters have a better claim on, and this is a setting touched twice a year.
 */
export function ThemeToggle() {
  const choice = useTheme((s) => s.choice);
  const cycle = useTheme((s) => s.cycle);

  return (
    <button
      type="button"
      onClick={cycle}
      title={`Theme: ${themeLabel(choice)} - click to change`}
      aria-label={`Theme: ${themeLabel(choice)}`}
      className="rounded px-2 py-1 text-xs text-graphite transition-colors hover:bg-graphite/10"
    >
      <span aria-hidden>{GLYPH[choice]}</span> {themeLabel(choice)}
    </button>
  );
}
