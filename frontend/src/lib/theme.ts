import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const THEME_KEY = 'smartsys-theme';

export function readTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = window.localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // Almacenamiento no disponible: usar preferencia del sistema.
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle('theme-dark', theme === 'dark');
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // La sesión sigue funcionando aunque no se pueda persistir.
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, setTheme, toggleTheme };
}
