/**
 * Theme choice and persistence key.
 *
 * Pure on purpose: index.html has to resolve a theme synchronously before the
 * first paint, long before any store exists, and the same rules have to hold
 * later when the toggle acts on it.
 *
 * Three themes, all concrete - unlike a 'system' option, every one of them
 * lands on the document exactly as chosen. The OS preference is consulted
 * exactly once - to pick a sensible default the very first time the app ever
 * launches on a machine - and never again after that: a toggle that a person
 * set can't be quietly overridden by their OS switching to night mode later,
 * and there is no OS notion of 'black' to defer to regardless.
 */

export type Theme = 'light' | 'dark' | 'black';

/** Cycle order for the toggle, and the order they are named in. */
export const THEMES: readonly Theme[] = ['light', 'dark', 'black'];

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
  return value === 'light' || value === 'dark' || value === 'black';
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

/**
 * Light -> Dark -> Black -> Light.
 *
 * One button has to visit three states, so the order is fixed and never
 * shortest-path: a person who overshoots gets back by carrying on in the same
 * direction, which is only true if the direction never changes. Black sits
 * past Dark, not before it - the deeper option is one press further in.
 */
export function nextTheme(theme: Theme): Theme {
  if (theme === 'light') return 'dark';
  return theme === 'dark' ? 'black' : 'light';
}

export function themeLabel(theme: Theme): string {
  if (theme === 'light') return 'Light';
  return theme === 'dark' ? 'Dark' : 'Black';
}
