'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Apply theme to <html> and sync with color-scheme
  const applyTheme = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);

    const root = document.documentElement;
    if (newTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  };

  // On mount: read from localStorage or system preference
  useEffect(() => {
    const stored = localStorage.getItem('theme') as 'light' | 'dark' | null;

    if (stored === 'dark') {
      applyTheme('dark');
    } else if (stored === 'light') {
      applyTheme('light');
    } else {
      // Detect system preference
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      applyTheme(systemPrefersDark ? 'dark' : 'light');
    }
  }, []);

  // Toggle between light/dark
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg border dark:border-white border-black hover:bg-gray-200 dark:hover:bg-gray-700 transition"
      aria-label="Toggle Theme"
    >
      {theme === 'dark' ? <Sun className="text-yellow-400" /> : <Moon className="text-blue-600" />}
    </button>
  );
}
