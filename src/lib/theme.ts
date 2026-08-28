/**
 * Theme choice, resolution and persistence key.
 *
 * Pure on purpose: main.tsx has to resolve a theme synchronously before the
 * first paint, long before any store exists, and the same rules have to hold
 * later when the toggle and the OS both have opinions.
 */

export type ThemeChoice = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

/** Cycle order. 'system' first: it is the default and the one to come back to. */
export const THEME_CHOICES: readonly ThemeChoice[] = ['system', 'light', 'dark'];

/**
 * localStorage, not the Tauri settings store.
 *
 * The pre-paint script in index.html needs this synchronously, and a store read
 * is a promise - dark-mode users would get a white flash on every launch. It is
 * a display preference on one machine; nothing is lost if the webview data dir
 * is ever cleared.
 */
export const THEME_STORAGE_KEY = 'prepos.theme';

export const DARK_QUERY = '(prefers-color-scheme: dark)';

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return value === 'system' || value === 'light' || value === 'dark';
}

/** Anything unrecognised - absent, stale, hand-edited - falls back to 'system'. */
export function readThemeChoice(raw: unknown): ThemeChoice {
  return isThemeChoice(raw) ? raw : 'system';
}

export function resolveTheme(choice: ThemeChoice, systemPrefersDark: boolean): ResolvedTheme {
  if (choice === 'system') return systemPrefersDark ? 'dark' : 'light';
  return choice;
}

export function nextThemeChoice(choice: ThemeChoice): ThemeChoice {
  const at = THEME_CHOICES.indexOf(choice);
  return THEME_CHOICES[(at + 1) % THEME_CHOICES.length] ?? 'system';
}

export function themeLabel(choice: ThemeChoice): string {
  if (choice === 'light') return 'Light';
  if (choice === 'dark') return 'Dark';
  return 'System';
}
