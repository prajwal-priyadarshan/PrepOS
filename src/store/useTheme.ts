import { create } from 'zustand';
import {
  DARK_QUERY,
  nextTheme,
  type Resolved,
  readTheme,
  resolveTheme,
  THEME_STORAGE_KEY,
  type Theme,
} from '@/lib/theme';

/**
 * Null outside a browser - a test importing this store should not have to stub
 * matchMedia to get a working light theme.
 */
function darkQuery(): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null;
  return window.matchMedia(DARK_QUERY);
}

function storedTheme(): Theme {
  try {
    return readTheme(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    // Storage can be unavailable; a theme is never worth failing a launch over.
    return 'system';
  }
}

/**
 * The class-free half of theming: every colour comes from a CSS variable, so
 * the only thing JS has to do is say which theme is in force. Takes a resolved
 * theme - the stylesheet has no rule for 'system'.
 */
export function applyTheme(theme: Resolved): void {
  document.documentElement.dataset.theme = theme;
}

interface ThemeState {
  /** What the person picked. Persisted. */
  theme: Theme;
  /** What that means right now. Stamped on the document. */
  resolved: Resolved;
  setTheme: (theme: Theme) => void;
  /** Advance one step through the cycle - what the toggle button does. */
  cycle: () => void;
}

export const useTheme = create<ThemeState>((set, get) => {
  const query = darkQuery();
  const theme = storedTheme();
  const resolved = resolveTheme(theme, query?.matches ?? false);
  applyTheme(resolved);

  /* The OS preference can change while the app is open - a night-mode
   * schedule, someone flipping the system switch. Only 'system' cares, but the
   * listener is one callback for the life of the process, so it stays attached
   * rather than being wired up and torn down every time the toggle is used. */
  query?.addEventListener('change', (event) => {
    if (get().theme !== 'system') return;
    const next: Resolved = event.matches ? 'dark' : 'light';
    applyTheme(next);
    set({ resolved: next });
  });

  return {
    theme,
    resolved,

    setTheme(theme) {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
      } catch {
        // Not persisting is survivable; not applying it is not.
      }
      const resolved = resolveTheme(theme, query?.matches ?? false);
      applyTheme(resolved);
      set({ theme, resolved });
    },

    cycle() {
      get().setTheme(nextTheme(get().theme));
    },
  };
});
