import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { IconButton } from '@/ui/primitives'

export interface PropertyDrawerProps {
  readonly mode: 'mobile' | 'tablet'
  readonly open: boolean
  readonly onClose: () => void
  readonly children: ReactNode
}

/**
 * Slide-in property panel for mobile / tablet. Mobile: bottom sheet
 * (max-h 70vh, rounded top corners — feels native). Tablet: right-side
 * drawer (320px wide, fills viewport height). Backdrop dims the canvas
 * and dismisses on tap. Desktop renders the panel inline via AppShell —
 * this component never mounts at desktop sizes.
 */
export const PropertyDrawer = ({ mode, open, onClose, children }: PropertyDrawerProps) => {
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null
  const sheetClass =
    mode === 'mobile'
      ? 'fixed left-0 right-0 bottom-0 max-h-[70vh] rounded-t-xl'
      : 'fixed right-0 top-0 bottom-0 w-80 border-l'
  return (
    <>
      <div
        data-testid="drawer-backdrop"
        className="fixed inset-0 z-30 bg-black/30"
        onClick={onClose}
        aria-hidden
      />
      <aside
        data-role="property-drawer"
        data-mode={mode}
        role="dialog"
        aria-modal="true"
        aria-labelledby="property-drawer-title"
        className={`z-40 flex flex-col overflow-y-auto bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800 ${sheetClass}`}
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-slate-700">
          <span id="property-drawer-title" className="text-sm font-semibold">Properties</span>
          <IconButton
            aria-label="Close properties panel"
            icon={<X size={18} aria-hidden />}
            onClick={onClose}
          />
        </header>
        <div className="flex-1">{children}</div>
      </aside>
    </>
  )
}
