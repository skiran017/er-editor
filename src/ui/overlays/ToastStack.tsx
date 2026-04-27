import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useUiStore } from '@/state/uiStore'

const AUTO_DISMISS_MS: Record<string, number> = { info: 4000, success: 4000, warning: 6000 }
// 'error' → no auto-dismiss.

const KIND_CLASS: Record<string, string> = {
  info: 'bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-900/30 dark:text-blue-100 dark:border-blue-800',
  success: 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-100 dark:border-emerald-800',
  warning: 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-900/30 dark:text-amber-100 dark:border-amber-800',
  error: 'bg-red-50 text-red-900 border-red-200 dark:bg-red-900/40 dark:text-red-100 dark:border-red-800',
}

export const ToastStack = () => {
  const toasts = useUiStore((s) => s.toasts)
  const dismiss = useUiStore((s) => s.dismissToast)
  const { t } = useTranslation()

  useEffect(() => {
    const timers = toasts
      .filter((x) => x.kind !== 'error')
      .map((x) => window.setTimeout(() => dismiss(x.id), AUTO_DISMISS_MS[x.kind] ?? 4000))
    return () => { timers.forEach(clearTimeout) }
  }, [toasts, dismiss])

  if (toasts.length === 0) return null
  // Toast cards stay `pointer-events-none` so clicks pass through to the
  // canvas underneath — otherwise a flow-hint toast (e.g. "pick first")
  // would block clicks on any node behind it for the toast's lifetime.
  // Only the × button re-enables pointer events, so it's still clickable.
  // Pinned top-right at every breakpoint with a tight width so the toast
  // doesn't dominate the canvas; on phones the max-w prevents overflow.
  return (
    <div
      className="pointer-events-none fixed right-2 top-2 z-50 flex max-w-[calc(100vw-1rem)] flex-col gap-1.5 sm:right-4 sm:top-4"
      role="region"
      aria-label="Notifications"
      data-role="toast-stack"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          data-role="toast"
          data-kind={toast.kind}
          className={`pointer-events-none flex w-[min(320px,calc(100vw-1rem))] items-center gap-2 rounded-md border px-3 py-2 text-sm shadow-md ${KIND_CLASS[toast.kind]}`}
        >
          <span className="flex-1 leading-snug">{t(toast.messageKey, toast.messageParams)}</span>
          {/* Plain button — IconButton would force a 44×44 touch target via
              pointer-coarse, which makes the toast row taller than its
              content. Auto-dismiss covers most cases; this × is a small
              visual hint with `pointer-events-auto` so the toast itself can
              stay click-through to the canvas. */}
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => dismiss(toast.id)}
            className="pointer-events-auto inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-base leading-none opacity-70 transition-colors hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
          >
            <span aria-hidden>×</span>
          </button>
        </div>
      ))}
    </div>
  )
}
