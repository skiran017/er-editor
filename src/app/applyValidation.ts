import { useValidationStore } from '@/state/validationStore'
import { parseQueryParams } from './queryParams'

/**
 * Reads `?validation` from the URL and overrides the persisted
 * `validationStore.enabled` flag for the session. Called once from
 * `main.tsx` at boot. The existing validation subscriber in `bootstrap.ts`
 * re-runs validation when `enabled` flips, so no extra glue is needed.
 */
export const applyValidationFromUrl = (search: string): void => {
  const { validation } = parseQueryParams(search)
  if (validation === null) return
  useValidationStore.getState().setEnabled(validation === 'on')
}
