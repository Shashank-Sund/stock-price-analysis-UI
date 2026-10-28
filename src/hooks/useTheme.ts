import { useCallback, useEffect, useState } from 'react';
import { applyTheme, saveTheme, storedTheme, systemTheme, type Theme } from '@/lib/theme';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => storedTheme() ?? systemTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Follow the operating system until the user makes an explicit choice.
  useEffect(() => {
    let mql: MediaQueryList;
    try {
      mql = window.matchMedia('(prefers-color-scheme: dark)');
    } catch {
      return;
    }
    const onChange = (e: MediaQueryListEvent) => {
      if (!storedTheme()) setTheme(e.matches ? 'dark' : 'light');
    };
    mql.addEventListener?.('change', onChange);
    return () => mql.removeEventListener?.('change', onChange);
  }, []);

  const toggle = useCallback(() => {
    setTheme((t) => {
      const next: Theme = t === 'dark' ? 'light' : 'dark';
      saveTheme(next);
      return next;
    });
  }, []);

  return { theme, toggle };
}
