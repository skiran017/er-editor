import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  getEffectiveTheme: () => 'light' | 'dark';
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'system',
      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },
      getEffectiveTheme: () => {
        const theme = get().theme;
        if (theme === 'system') {
          return window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';
        }
        return theme;
      },
    }),
    {
      name: 'er-editor-theme',
    }
  )
);

// Apply theme to document
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const effectiveTheme =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme;

  root.classList.remove('light', 'dark');
  root.classList.add(effectiveTheme);
}

// Initialize theme on load
if (typeof window !== 'undefined') {
  const store = useThemeStore.getState();
  applyTheme(store.theme);

  // Listen for system theme changes
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => {
      const currentTheme = useThemeStore.getState().theme;
      if (currentTheme === 'system') {
        applyTheme('system');
      }
    });
}
