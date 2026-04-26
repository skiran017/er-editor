const DARK_CLASS = 'dark'

/**
 * Strips the `dark` class from `<html>` so every Tailwind `dark:*` utility
 * resolves to its light counterpart for the duration of the caller's
 * synchronous-or-async work. Returns a callback that restores the class
 * to its original presence/absence.
 *
 * Used by the export flow so PNG / SVG output is always rendered in light
 * mode, regardless of the user's current theme. Light-mode output ships
 * cleanly into documents, presentations, and printed material — which is
 * the primary consumer of an exported diagram.
 */
export const forceLightMode = (): (() => void) => {
  if (typeof document === 'undefined') return () => {}
  const root = document.documentElement
  const wasDark = root.classList.contains(DARK_CLASS)
  if (wasDark) root.classList.remove(DARK_CLASS)
  return () => {
    if (wasDark) root.classList.add(DARK_CLASS)
  }
}
