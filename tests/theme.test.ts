import { describe, expect, it } from 'vitest';
import {
  isThemeChoice,
  nextThemeChoice,
  readThemeChoice,
  resolveTheme,
  THEME_CHOICES,
  themeLabel,
} from '../src/lib/theme';

describe('readThemeChoice', () => {
  it('keeps a stored choice', () => {
    expect(readThemeChoice('dark')).toBe('dark');
    expect(readThemeChoice('light')).toBe('light');
    expect(readThemeChoice('system')).toBe('system');
  });

  it('falls back to system for anything else', () => {
    expect(readThemeChoice(null)).toBe('system');
    expect(readThemeChoice('')).toBe('system');
    expect(readThemeChoice('midnight')).toBe('system');
    expect(readThemeChoice(1)).toBe('system');
  });
});

describe('isThemeChoice', () => {
  it('accepts exactly the three choices', () => {
    for (const choice of THEME_CHOICES) expect(isThemeChoice(choice)).toBe(true);
    expect(isThemeChoice('Dark')).toBe(false);
    expect(isThemeChoice(undefined)).toBe(false);
  });
});

describe('resolveTheme', () => {
  it('follows the OS only under system', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });

  it('ignores the OS once a choice is explicit', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });
});

describe('nextThemeChoice', () => {
  it('cycles system -> light -> dark -> system', () => {
    expect(nextThemeChoice('system')).toBe('light');
    expect(nextThemeChoice('light')).toBe('dark');
    expect(nextThemeChoice('dark')).toBe('system');
  });

  it('returns to where it started after one full cycle', () => {
    let choice = THEME_CHOICES[0] ?? 'system';
    for (let i = 0; i < THEME_CHOICES.length; i++) choice = nextThemeChoice(choice);
    expect(choice).toBe('system');
  });
});

describe('themeLabel', () => {
  it('names each choice', () => {
    expect(themeLabel('system')).toBe('System');
    expect(themeLabel('light')).toBe('Light');
    expect(themeLabel('dark')).toBe('Dark');
  });
});
