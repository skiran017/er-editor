import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { installSubscribers } from '@/app/bootstrap'
import { initI18n } from '@/platform/i18n'
import './index.css'

installSubscribers()

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('#root element not found')

void initI18n().then(() => {
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
