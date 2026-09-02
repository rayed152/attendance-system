import { useState, useEffect, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'atd-theme-mode';

const isThemeMode = (value: string | null): value is ThemeMode =>
  value === 'light' || value === 'dark' || value === 'system';

const getSystemTheme = (): 'light' | 'dark' =>
  window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';

const applyTheme = (mode: ThemeMode): void => {
  const effective = mode === 'system' ? getSystemTheme() : mode;
  document.documentElement.setAttribute('data-theme', effective);
};

/**
 * Persisted light/dark/system theme mode. Applying the theme is just
 * setting `data-theme` on <html> — the CSS variables in index.css (and the
 * tailwind.config.js slate remap) do the rest, so no component needs to
 * read this hook's value to render correctly.
 */
export const useTheme = () => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isThemeMode(stored) ? stored : 'system';
  });

  useEffect(() => {
    applyTheme(mode);
    localStorage.setItem(STORAGE_KEY, mode);

    if (mode === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: light)');
      const handleChange = () => applyTheme('system');
      mq.addEventListener('change', handleChange);
      return () => mq.removeEventListener('change', handleChange);
    }
  }, [mode]);

  const cycleMode = useCallback(() => {
    setMode((prev) => (prev === 'light' ? 'dark' : prev === 'dark' ? 'system' : 'light'));
  }, []);

  return { mode, setMode, cycleMode };
};
