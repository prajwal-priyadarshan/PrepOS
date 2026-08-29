/**
 * Theme choice and persistence key.
 *
 * Pure on purpose: main.tsx has to resolve a theme synchronously before the
 * first paint, long before any store exists, and the same rules have to hold
 * later when the toggle acts on it.
 *
 * Only two themes exist. The OS preference is consulted exactly once - to
 * pick a sensible default the very first time the app ever launches on a
 * machine - and never again after that: a toggle that a person set can't be
 * quietly overridden by their OS switching to night mode later.
 */

export type Theme = 'light' | 'dark';

export const THEMES: readonly Theme[] = ['light', 'dark'];

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
  return value === 'light' || value === 'dark';
}

/**
 * Anything recognised is kept as-is. Anything else - never saved before, hand
 * edited, from an older build that still wrote 'system' - falls back to the
 * OS preference at this exact moment, which only matters this one time.
 */
export function readTheme(raw: unknown, systemPrefersDark: boolean): Theme {
  if (isTheme(raw)) return raw;
  return systemPrefersDark ? 'dark' : 'light';
}

export function otherTheme(theme: Theme): Theme {
  return theme === 'light' ? 'dark' : 'light';
}

export function themeLabel(theme: Theme): string {
  return theme === 'light' ? 'Light' : 'Dark';
}
