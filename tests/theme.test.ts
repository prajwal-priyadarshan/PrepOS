import { describe, expect, it } from 'vitest';
import {
  isTheme,
  nextTheme,
  readTheme,
  resolveTheme,
  THEMES,
  type Theme,
  themeLabel,
} from '../src/lib/theme';

describe('readTheme', () => {
  it('keeps a stored theme', () => {
    expect(readTheme('dark')).toBe('dark');
    expect(readTheme('light')).toBe('light');
    expect(readTheme('system')).toBe('system');
  });

  it('starts on system for anything else', () => {
    expect(readTheme(null)).toBe('system');
    expect(readTheme('')).toBe('system');
    expect(readTheme('Dark')).toBe('system');
    expect(readTheme(1)).toBe('system');
  });
});

describe('isTheme', () => {
  it('accepts exactly the three themes', () => {
    for (const theme of THEMES) expect(isTheme(theme)).toBe(true);
    expect(isTheme('Dark')).toBe(false);
    expect(isTheme('auto')).toBe(false);
    expect(isTheme(undefined)).toBe(false);
  });
});

describe('resolveTheme', () => {
  it('passes an explicit choice through, whatever the OS says', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('defers to the OS only for system', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });
});

describe('nextTheme', () => {
  it('cycles light, dark, system', () => {
    expect(nextTheme('light')).toBe('dark');
    expect(nextTheme('dark')).toBe('system');
    expect(nextTheme('system')).toBe('light');
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
    expect(themeLabel('system')).toBe('System');
  });
});
