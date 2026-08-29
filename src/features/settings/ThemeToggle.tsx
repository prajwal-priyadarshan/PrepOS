import { THEMES, themeLabel } from '@/lib/theme';
import { useTheme } from '@/store/useTheme';

/**
 * Two named buttons, not a switch.
 *
 * A sliding track says "one of two states" but never which - the reader has to
 * learn that right means dark. Naming both and inverting the selected one says
 * where you are and where you would land in the same glance, which is what a
 * segmented control is for.
 */
export function ThemeToggle() {
  const theme = useTheme((s) => s.theme);
  const setTheme = useTheme((s) => s.setTheme);

  return (
    <div
      role="group"
      aria-label="Theme"
      className="flex shrink-0 overflow-hidden rounded-sm border border-divider"
    >
      {THEMES.map((option) => {
        const selected = option === theme;
        return (
          <button
            key={option}
            type="button"
            onClick={() => setTheme(option)}
            aria-pressed={selected}
            className={[
              'px-[13px] py-1.5 text-xs tracking-[0.04em] transition-colors',
              selected ? 'bg-ink text-paper' : 'text-muted hover:bg-tint',
            ].join(' ')}
          >
            {themeLabel(option)}
          </button>
        );
      })}
    </div>
  );
}
