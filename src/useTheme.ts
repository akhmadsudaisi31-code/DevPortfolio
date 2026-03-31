import { useState, useEffect } from 'react';

const THEME_STORAGE_KEY = 'theme';

const getInitialTheme = () => {
  if (typeof window === 'undefined') {
    return true;
  }

  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return savedTheme ? savedTheme === 'dark' : true;
};

export function useTheme() {
  const [isDark, setIsDark] = useState(getInitialTheme);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.toggle('dark', isDark);
    root.style.colorScheme = isDark ? 'dark' : 'light';
    window.localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
  }, [isDark]);

  return { isDark, toggleTheme: () => setIsDark((current) => !current) };
}
