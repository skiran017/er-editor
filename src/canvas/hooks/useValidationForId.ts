import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useValidationStore } from '@/state/validationStore'
import { pickSeverity } from '@/state/selectors'
import type { NodeId, EdgeId } from '@/domain/types'

export interface ValidationForId {
  readonly severity: 'none' | 'warning' | 'error'
  readonly messages: readonly string[]
}

/**
 * Packages validation state for a single node or edge: severity (badge
 * colour) + already-localised messages (tooltip / property-panel list).
 *
 * Spec §6.4 surfaces validation in two places: a warning badge on
 * node/edge components (tooltip lists the messages) and the property
 * panel. Both consume this hook so resolution stays in one place.
 */
export const useValidationForId = (id: NodeId | EdgeId): ValidationForId => {
  const { t } = useTranslation('validation')
  const errors = useValidationStore((s) => s.errorsById[id])
  return useMemo(() => {
    const severity = pickSeverity(errors)
    const messages = (errors ?? []).map((e) =>
      t(e.messageKey, e.messageParams),
    )
    return { severity, messages }
  }, [errors, t])
}
