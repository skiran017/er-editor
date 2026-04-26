import { useUiStore } from '@/state/uiStore'
import { parseQueryParams } from './queryParams'

/**
 * Reads `?lang` from the URL and writes it to `uiStore.language` if
 * present and recognised. Called once from `main.tsx` BEFORE `initI18n`
 * runs — the i18next init reads the resolved language from the store.
 */
export const applyLanguageFromUrl = (search: string): void => {
  const { lang } = parseQueryParams(search)
  if (lang === null) return
  useUiStore.getState().setLanguage(lang)
}
