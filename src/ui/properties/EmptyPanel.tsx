import { useTranslation } from 'react-i18next'

export const EmptyPanel = () => {
  const { t } = useTranslation('properties')
  return (
    <div className="flex h-full items-center justify-center p-4 text-xs text-slate-500 dark:text-slate-400" data-role="empty-panel">
      {t('empty')}
    </div>
  )
}
