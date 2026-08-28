import { create } from 'zustand';
import {
  DARK_QUERY,
  nextThemeChoice,
  type ResolvedTheme,
  readThemeChoice,
  resolveTheme,
  THEME_STORAGE_KEY,
  type ThemeChoice,
} from '@/lib/theme';

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(DARK_QUERY).matches;
}

function storedChoice(): ThemeChoice {
  try {
    return readThemeChoice(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    // Storage can be unavailable; a theme is never worth failing a launch over.
    return 'system';
  }
}

/**
 * The class-free half of theming: every colour comes from a CSS variable, so
 * the only thing JS has to do is say which theme is in force.
 */
export function applyTheme(resolved: ResolvedTheme): void {
  document.documentElement.dataset.theme = resolved;
}

interface ThemeState {
  choice: ThemeChoice;
  resolved: ResolvedTheme;
  setChoice: (choice: ThemeChoice) => void;
  cycle: () => void;
  /** Re-resolve after the OS switched. Only moves anything under 'system'. */
  syncSystem: () => void;
}

export const useTheme = create<ThemeState>((set, get) => {
  const initial = storedChoice();

  const commit = (choice: ThemeChoice) => {
    const resolved = resolveTheme(choice, systemPrefersDark());
    applyTheme(resolved);
    set({ choice, resolved });
  };

  return {
    choice: initial,
    resolved: resolveTheme(initial, systemPrefersDark()),

    setChoice(choice) {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, choice);
      } catch {
        // Not persisting is survivable; not applying it is not.
      }
      commit(choice);
    },

    cycle() {
      get().setChoice(nextThemeChoice(get().choice));
    },

    syncSystem() {
      commit(get().choice);
    },
  };
});

/**
 * Follow the OS while the choice is 'system'. Windows flips this on a schedule
 * for some people, and a window that stays light at sunset is the bug.
 */
export function installThemeWatcher(): () => void {
  const media = window.matchMedia(DARK_QUERY);
  const onChange = () => useTheme.getState().syncSystem();
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}
