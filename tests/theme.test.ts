import { describe, expect, it } from 'vitest';
import { isTheme, otherTheme, readTheme, THEMES, themeLabel } from '../src/lib/theme';

describe('readTheme', () => {
  it('keeps a stored theme', () => {
    expect(readTheme('dark', false)).toBe('dark');
    expect(readTheme('light', true)).toBe('light');
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
  it('accepts exactly the two themes', () => {
    for (const theme of THEMES) expect(isTheme(theme)).toBe(true);
    expect(isTheme('system')).toBe(false);
    expect(isTheme('Dark')).toBe(false);
    expect(isTheme(undefined)).toBe(false);
  });
});

describe('otherTheme', () => {
  it('swaps light and dark', () => {
    expect(otherTheme('light')).toBe('dark');
    expect(otherTheme('dark')).toBe('light');
  });
});

describe('themeLabel', () => {
  it('names each theme', () => {
    expect(themeLabel('light')).toBe('Light');
    expect(themeLabel('dark')).toBe('Dark');
  });
});
