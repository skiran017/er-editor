import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useUiStore } from '@/state/uiStore'
import { IconButton } from '@/ui/primitives'

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
  // pinned to the bottom-right would block clicks on any node placed near
  // it for the toast's 4-second lifetime, and users would have to wait or
  // double-click to interact. Only the dismiss button re-enables pointer
  // events, so the × is still clickable.
  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2"
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
          className={`pointer-events-none flex min-w-[240px] items-start gap-2 rounded border px-3 py-2 text-sm shadow ${KIND_CLASS[toast.kind]}`}
        >
          <span className="flex-1">{t(toast.messageKey, toast.messageParams)}</span>
          <span className="pointer-events-auto">
            <IconButton
              aria-label="Dismiss notification"
              size="sm"
              onClick={() => dismiss(toast.id)}
              icon={<span aria-hidden>×</span>}
            />
          </span>
        </div>
      ))}
    </div>
  )
}
