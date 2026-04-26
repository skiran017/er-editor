import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useUiStore } from '@/state/uiStore'

/**
 * Full-viewport overlay rendered while a PNG / SVG export is in flight.
 * Masks the brief light-mode flicker that happens because the export
 * temporarily strips the `dark` class from `<html>` to force light-mode
 * rasterisation. backdrop-blur softens any visible content underneath
 * so the flicker isn't perceptible.
 *
 * Pointer-events stay intentionally enabled so a stray click while
 * exporting doesn't reach the canvas underneath; the overlay swallows
 * the click without doing anything.
 */
export const ExportOverlay = () => {
  const { t } = useTranslation('menu')
  const exporting = useUiStore((s) => s.exporting)
  if (!exporting) return null
  return (
    <div
      role="status"
      aria-live="polite"
      data-role="export-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 backdrop-blur-md dark:bg-slate-900/95"
    >
      <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white/90 px-5 py-3 text-slate-700 shadow-xl backdrop-blur-md dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-200">
        <Loader2 size={20} className="animate-spin text-blue-500" aria-hidden />
        <span className="text-sm font-medium">{t('menu:app.exporting')}</span>
      </div>
    </div>
  )
}
