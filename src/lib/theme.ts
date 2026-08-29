/**
 * Theme choice and persistence key.
 *
 * Pure on purpose: index.html has to resolve a theme synchronously before the
 * first paint, long before any store exists, and the same rules have to hold
 * later when the toggle acts on it.
 *
 * Three choices, two outcomes. 'light' and 'dark' are answers; 'system' is a
 * standing instruction to keep asking the OS. That is why choosing a theme and
 * resolving one are separate steps - only the resolved half ever reaches the
 * document, and 'system' can resolve differently an hour later without anyone
 * touching the toggle.
 */

export type Theme = 'light' | 'dark' | 'system';

/** What actually lands on the document. 'system' never does. */
export type Resolved = 'light' | 'dark';

/** Cycle order for the toggle, and the order they are named in. */
export const THEMES: readonly Theme[] = ['light', 'dark', 'system'];

/**
 * localStorage, not the Tauri settings store.
 *
 * The pre-paint script in index.html needs this synchronously, and a store read
 * is a promise - a flash of the wrong theme on every launch. It is a display
 * preference on one machine; nothing is lost if the webview data dir is ever
 * cleared.
 */
export const THEME_STORAGE_KEY = 'prepos.theme';

export const DARK_QUERY = '(prefers-color-scheme: dark)';

export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark' || value === 'system';
}

/**
 * Anything recognised is kept as-is. Anything else - never saved before, hand
 * edited, storage unreadable - starts on 'system', so a first launch matches
 * the machine it is on without claiming the person chose that.
 */
export function readTheme(raw: unknown): Theme {
  return isTheme(raw) ? raw : 'system';
}

export function resolveTheme(theme: Theme, systemPrefersDark: boolean): Resolved {
  if (theme !== 'system') return theme;
  return systemPrefersDark ? 'dark' : 'light';
}

/**
 * Light -> Dark -> System -> Light.
 *
 * One button has to visit three states, so the order is fixed and never
 * shortest-path: a person who overshoots gets back by carrying on in the same
 * direction, which is only true if the direction never changes.
 */
export function nextTheme(theme: Theme): Theme {
  if (theme === 'light') return 'dark';
  return theme === 'dark' ? 'system' : 'light';
}

export function themeLabel(theme: Theme): string {
  if (theme === 'light') return 'Light';
  return theme === 'dark' ? 'Dark' : 'System';
}
