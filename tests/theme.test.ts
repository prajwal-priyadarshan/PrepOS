import { describe, expect, it } from 'vitest';
import { isTheme, nextTheme, readTheme, THEMES, type Theme, themeLabel } from '../src/lib/theme';

describe('readTheme', () => {
  it('keeps a stored theme', () => {
    expect(readTheme('dark', false)).toBe('dark');
    expect(readTheme('light', true)).toBe('light');
    expect(readTheme('black', false)).toBe('black');
  });

  it('falls back to the OS preference for anything else', () => {
    expect(readTheme(null, true)).toBe('dark');
    expect(readTheme(null, false)).toBe('light');
    expect(readTheme('', true)).toBe('dark');
    expect(readTheme('system', false)).toBe('light');
    expect(readTheme(1, true)).toBe('dark');
  });
});

describe('isTheme', () => {
  it('accepts exactly the three themes', () => {
    for (const theme of THEMES) expect(isTheme(theme)).toBe(true);
    expect(isTheme('system')).toBe(false);
    expect(isTheme('Dark')).toBe(false);
    expect(isTheme(undefined)).toBe(false);
  });
});

describe('nextTheme', () => {
  it('cycles light, dark, black', () => {
    expect(nextTheme('light')).toBe('dark');
    expect(nextTheme('dark')).toBe('black');
    expect(nextTheme('black')).toBe('light');
  });

  it('returns to where it started in one lap', () => {
    for (const start of THEMES) {
      let theme: Theme = start;
      for (let i = 0; i < THEMES.length; i++) theme = nextTheme(theme);
      expect(theme).toBe(start);
    }
  });
});

describe('themeLabel', () => {
  it('names each theme', () => {
    expect(themeLabel('light')).toBe('Light');
    expect(themeLabel('dark')).toBe('Dark');
    expect(themeLabel('black')).toBe('Black');
  });
});
