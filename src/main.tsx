import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { installSubscribers } from '@/app/bootstrap'
import { installThemeSubscriber } from '@/app/theme'
import { applyExamModeFromUrl } from '@/app/examMode'
import { applyLanguageFromUrl } from '@/app/applyLanguage'
import { applyValidationFromUrl } from '@/app/applyValidation'
import { applyModeFromUrl } from '@/app/applyMode'
import { initI18n } from '@/platform/i18n'
import { useUiStore } from '@/state/uiStore'
import './index.css'

installSubscribers()
installThemeSubscriber()
applyExamModeFromUrl()
applyLanguageFromUrl(window.location.search)
applyValidationFromUrl(window.location.search)
applyModeFromUrl(window.location.search)

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('#root element not found')

void initI18n(useUiStore.getState().language).then(() => {
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
