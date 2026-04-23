import { useTranslation } from 'react-i18next'
import { Button } from '@/ui/primitives'
import { useUiStore } from '@/state/uiStore'

export interface ErrorModalProps {
  readonly modalId: string
  readonly messageKey: string
  readonly messageParams?: Readonly<Record<string, string>>
  readonly detail?: string
}

export const ErrorModal = ({ modalId, messageKey, messageParams, detail }: ErrorModalProps) => {
  const { t } = useTranslation()
  const pop = useUiStore((s) => s.popModal)
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/30"
      role="alertdialog"
      aria-modal
      aria-labelledby={`${modalId}-title`}
      data-modal-id={modalId}
      data-kind="error"
    >
      <div className="w-[min(480px,90vw)] rounded bg-white p-4 shadow-lg">
        <h2 id={`${modalId}-title`} className="mb-2 text-base font-semibold text-red-700">
          {t('error.title', { ns: 'modals' })}
        </h2>
        <p className="mb-2 text-sm text-slate-800">{t(messageKey, messageParams)}</p>
        {detail && (
          <pre className="mb-3 max-h-40 overflow-auto rounded bg-slate-100 p-2 text-xs text-slate-600">
            {detail}
          </pre>
        )}
        <div className="flex justify-end">
          <Button variant="primary" onClick={pop}>
            {t('error.dismiss', { ns: 'modals' })}
          </Button>
        </div>
      </div>
    </div>
  )
}
