import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'

// Static imports so bundler can tree-shake and runtime has no fetch.
import enCommon from './locales/en/common.json'
import enToolbar from './locales/en/toolbar.json'
import enMenu from './locales/en/menu.json'
import enProperties from './locales/en/properties.json'
import enModals from './locales/en/modals.json'
import enValidation from './locales/en/validation.json'

import itCommon from './locales/it/common.json'
import itToolbar from './locales/it/toolbar.json'
import itMenu from './locales/it/menu.json'
import itProperties from './locales/it/properties.json'
import itModals from './locales/it/modals.json'
import itValidation from './locales/it/validation.json'

const resources = {
  en: {
    common: enCommon,
    toolbar: enToolbar,
    menu: enMenu,
    properties: enProperties,
    modals: enModals,
    validation: enValidation,
  },
  it: {
    common: itCommon,
    toolbar: itToolbar,
    menu: itMenu,
    properties: itProperties,
    modals: itModals,
    validation: itValidation,
  },
} as const

let inFlight: Promise<typeof i18next> | null = null

export const initI18n = async (lng = 'en'): Promise<typeof i18next> => {
  if (i18next.isInitialized) return i18next
  if (inFlight) return inFlight
  inFlight = (async () => {
    await i18next.use(initReactI18next).init({
      resources,
      lng,
      fallbackLng: 'en',
      ns: ['common', 'toolbar', 'menu', 'properties', 'modals', 'validation'],
      defaultNS: 'common',
      interpolation: { escapeValue: false },
      returnNull: false,
    })
    return i18next
  })()
  return inFlight
}
