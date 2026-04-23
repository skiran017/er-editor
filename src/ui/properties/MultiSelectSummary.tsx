import { useTranslation } from 'react-i18next'

export interface MultiSelectSummaryProps { readonly count: number }

export const MultiSelectSummary = ({ count }: MultiSelectSummaryProps) => {
  const { t } = useTranslation('properties')
  return (
    <div className="p-3 text-sm text-slate-700 dark:text-slate-200" data-role="multi-select-summary">
      {t('multi', { count })}
    </div>
  )
}
