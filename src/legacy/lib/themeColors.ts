import { useThemeStore } from '../store/themeStore';

/**
 * Get theme-aware colors for Konva shapes
 */
export function getThemeColors() {
  const effectiveTheme = useThemeStore.getState().getEffectiveTheme();

  return {
    stroke: effectiveTheme === 'dark' ? 'white' : 'black',
    fill: effectiveTheme === 'dark' ? '#1f2937' : 'white', // gray-800 in dark, white in light
    text: effectiveTheme === 'dark' ? 'white' : 'black',
  };
}

/**
 * Get theme-aware colors (non-hook version for use outside React components)
 */
export function getThemeColorsSync() {
  const root = document.documentElement;
  const isDark = root.classList.contains('dark');

  return {
    stroke: isDark ? 'white' : 'black',
    fill: isDark ? '#1f2937' : 'white',
    text: isDark ? 'white' : 'black',
  };
}
