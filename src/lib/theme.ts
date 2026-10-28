import { readString, writeString } from './storage';

export type Theme = 'light' | 'dark';
export const THEME_KEY = 'spa.theme';

export function storedTheme(): Theme | null {
  const v = readString(THEME_KEY);
  return v === 'light' || v === 'dark' ? v : null;
}

export function systemTheme(): Theme {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function saveTheme(theme: Theme): void {
  writeString(THEME_KEY, theme);
}
