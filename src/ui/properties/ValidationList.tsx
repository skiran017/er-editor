import { useTranslation } from 'react-i18next'
import { useValidationStore } from '@/state/validationStore'
import type { NodeId, EdgeId } from '@/domain/types'

export interface ValidationListProps {
  readonly targetId: NodeId | EdgeId
}

/**
 * Spec §6.4: the property panel lists validation violations relevant to the
 * currently selected element. Ordered with errors before warnings so the
 * highest-severity issues appear first.
 */
export const ValidationList = ({ targetId }: ValidationListProps) => {
  const { t } = useTranslation('validation')
  const { t: tCommon } = useTranslation('properties')
  const errors = useValidationStore((s) => s.errorsById[targetId])
  if (!errors || errors.length === 0) return null

  const sorted = [...errors].sort((a, b) => {
    if (a.severity === b.severity) return 0
    return a.severity === 'error' ? -1 : 1
  })

  return (
    <section
      className="flex flex-col gap-1 border-t border-slate-200 p-3 dark:border-slate-700"
      data-role="validation-list"
    >
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {tCommon('validation')} ({sorted.length})
      </h4>
      <ul className="flex flex-col gap-1">
        {sorted.map((err, idx) => (
          <li
            key={`${err.ruleId}-${idx}`}
            data-role="validation-row"
            data-severity={err.severity}
            className={
              err.severity === 'error'
                ? 'rounded border border-red-200 bg-red-50 p-2 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200'
                : 'rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200'
            }
          >
            {t(err.messageKey, err.messageParams)}
          </li>
        ))}
      </ul>
    </section>
  )
}
