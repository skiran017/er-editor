import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useUiStore, type Theme } from '@/state/uiStore'

// Tailwind slate-900 / slate-200 / slate-700 / slate-800 + white as RGB.
// Hardcoded so the overlay's appearance does NOT depend on the `.dark`
// class on <html> — the export flow temporarily strips that class to
// force light-mode rasterisation, and any `dark:*` utility on this
// component would flip mid-export, producing a visible flash.
const LIGHT_BACKDROP = 'rgb(255, 255, 255)'
const DARK_BACKDROP = 'rgb(15, 23, 42)'
const LIGHT_CARD = 'rgba(255, 255, 255, 0.92)'
const DARK_CARD = 'rgba(30, 41, 59, 0.92)'
const LIGHT_TEXT = 'rgb(51, 65, 85)'
const DARK_TEXT = 'rgb(226, 232, 240)'
const LIGHT_BORDER = 'rgb(226, 232, 240)'
const DARK_BORDER = 'rgb(51, 65, 85)'

const resolveDark = (theme: Theme): boolean => {
  if (theme === 'dark') return true
  if (theme === 'light') return false
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/**
 * Full-viewport overlay rendered while a PNG / SVG export is in flight.
 * Backgrounds are pinned via inline `style` (NOT `dark:*` Tailwind
 * classes) so the overlay's appearance is decoupled from the `.dark`
 * class on `<html>` — the export flow strips that class to force
 * light-mode rasterisation, and a class-driven background would flip
 * mid-export and cause a visible flash. Pointer-events stay on so
 * stray clicks during export are swallowed harmlessly.
 */
export const ExportOverlay = () => {
  const { t } = useTranslation('menu')
  const exporting = useUiStore((s) => s.exporting)
  const theme = useUiStore((s) => s.theme)
  if (!exporting) return null
  const dark = resolveDark(theme)
  return (
    <div
      role="status"
      aria-live="polite"
      data-role="export-overlay"
      className="fixed inset-0 z-70 flex items-center justify-center"
      style={{ backgroundColor: dark ? DARK_BACKDROP : LIGHT_BACKDROP }}
    >
      <div
        className="flex items-center gap-3 rounded-lg px-5 py-3 text-sm shadow-xl"
        style={{
          backgroundColor: dark ? DARK_CARD : LIGHT_CARD,
          color: dark ? DARK_TEXT : LIGHT_TEXT,
          border: `1px solid ${dark ? DARK_BORDER : LIGHT_BORDER}`,
        }}
      >
        <Loader2 size={20} className="animate-spin" style={{ color: 'rgb(59, 130, 246)' }} aria-hidden />
        <span className="font-medium">{t('menu:app.exporting')}</span>
      </div>
    </div>
  )
}
