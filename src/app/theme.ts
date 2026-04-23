import { useUiStore, type Theme } from '@/state/uiStore'

// Tailwind is configured with `@custom-variant dark (&:is(.dark *))` in
// src/index.css, so every `dark:…` utility activates when an ancestor
// carries the `dark` class. The body `:root` / `.dark` CSS variables also
// flip there. Centralise the rule in one subscriber so themes apply on
// initial load AND react to live changes from the Menu theme picker.

const MEDIA = '(prefers-color-scheme: dark)'

const resolveDark = (theme: Theme): boolean => {
  if (theme === 'dark') return true
  if (theme === 'light') return false
  return typeof window !== 'undefined' && window.matchMedia(MEDIA).matches
}

const applyThemeClass = (theme: Theme): void => {
  if (typeof document === 'undefined') return
  const isDark = resolveDark(theme)
  document.documentElement.classList.toggle('dark', isDark)
}

/**
 * Wires the Menu theme picker to the DOM:
 *  - applies the current theme class on startup
 *  - re-applies on every `theme` change
 *  - when theme === 'system', also reacts to the OS preference changing
 *
 * Returns a cleanup function so test harnesses can tear it down.
 */
export const installThemeSubscriber = (): (() => void) => {
  applyThemeClass(useUiStore.getState().theme)

  const unsubStore = useUiStore.subscribe(
    (s) => s.theme,
    (theme) => applyThemeClass(theme),
  )

  let media: MediaQueryList | null = null
  const onMediaChange = () => {
    if (useUiStore.getState().theme === 'system') {
      applyThemeClass('system')
    }
  }
  if (typeof window !== 'undefined' && window.matchMedia) {
    media = window.matchMedia(MEDIA)
    media.addEventListener('change', onMediaChange)
  }

  return () => {
    unsubStore()
    media?.removeEventListener('change', onMediaChange)
  }
}
