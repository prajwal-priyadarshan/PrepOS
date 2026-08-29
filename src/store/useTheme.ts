import { create } from 'zustand';
import { DARK_QUERY, otherTheme, readTheme, THEME_STORAGE_KEY, type Theme } from '@/lib/theme';

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(DARK_QUERY).matches;
}

function storedTheme(): Theme {
  try {
    return readTheme(localStorage.getItem(THEME_STORAGE_KEY), systemPrefersDark());
  } catch {
    // Storage can be unavailable; a theme is never worth failing a launch over.
    return systemPrefersDark() ? 'dark' : 'light';
  }
}

/**
 * The class-free half of theming: every colour comes from a CSS variable, so
 * the only thing JS has to do is say which theme is in force.
 */
export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
}

export const useTheme = create<ThemeState>((set, get) => {
  const initial = storedTheme();
  applyTheme(initial);

  return {
    theme: initial,

    setTheme(theme) {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
      } catch {
        // Not persisting is survivable; not applying it is not.
      }
      applyTheme(theme);
      set({ theme });
    },

    toggle() {
      get().setTheme(otherTheme(get().theme));
    },
  };
});
