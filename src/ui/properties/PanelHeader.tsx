import { useTranslation } from 'react-i18next'
import { useSelectionStore } from '@/state/selectionStore'

export interface PanelHeaderProps {
  readonly titleKey: string
}

export const PanelHeader = ({ titleKey }: PanelHeaderProps) => {
  const { t } = useTranslation('properties')
  const clear = useSelectionStore((s) => s.clear)
  return (
    <header
      className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-slate-700"
      data-role="panel-header"
    >
      <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t(titleKey)}</h2>
      <button
        type="button"
        onClick={clear}
        aria-label={t('close')}
        title={t('close')}
        className="grid h-6 w-6 place-items-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
        data-role="panel-close"
      >
        <svg viewBox="0 0 14 14" width={12} height={12} aria-hidden="true">
          <path
            d="M2 2 L12 12 M12 2 L2 12"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </button>
    </header>
  )
}
