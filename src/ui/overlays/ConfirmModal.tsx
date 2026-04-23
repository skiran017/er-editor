import { useTranslation } from 'react-i18next'
import { Button } from '@/ui/primitives'
import { useUiStore } from '@/state/uiStore'

export interface ConfirmModalProps {
  readonly modalId: string
  readonly titleKey: string
  readonly messageKey: string
  readonly messageParams?: Readonly<Record<string, string>>
  readonly danger?: boolean
  readonly onConfirm: () => void
  readonly onCancel?: () => void
}

export const ConfirmModal = ({
  modalId,
  titleKey,
  messageKey,
  messageParams,
  danger,
  onConfirm,
  onCancel,
}: ConfirmModalProps) => {
  const { t } = useTranslation()
  const pop = useUiStore((s) => s.popModal)

  const handleCancel = () => {
    onCancel?.()
    pop()
  }
  const handleConfirm = () => {
    onConfirm()
    pop()
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 dark:bg-black/60"
      role="dialog"
      aria-modal
      aria-labelledby={`${modalId}-title`}
      data-modal-id={modalId}
      data-kind="confirm"
    >
      <div className="w-[min(420px,90vw)] rounded bg-white p-4 shadow-lg dark:bg-slate-800 dark:text-slate-100">
        <h2 id={`${modalId}-title`} className="mb-2 text-base font-semibold">{t(titleKey)}</h2>
        <p className="mb-4 text-sm text-slate-700 dark:text-slate-200">{t(messageKey, messageParams)}</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={handleCancel}>
            {t('cancel', { ns: 'common' })}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={handleConfirm}>
            {t('confirm', { ns: 'common' })}
          </Button>
        </div>
      </div>
    </div>
  )
}
