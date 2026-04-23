import { useDiagramStore } from '@/state/diagramStore'
import { useValidationStore } from '@/state/validationStore'
import { validateChen } from '@/notation/chen/rules'
import { checkInvariants } from '@/domain/invariants'
import type { Diagram } from '@/domain/types'
import { debounce } from './debounce'

const VALIDATION_DEBOUNCE_MS = 150

export const installSubscribers = (): (() => void) => {
  const runValidation = debounce((diagram: Diagram) => {
    if (!useValidationStore.getState().enabled) return
    useValidationStore.getState().setErrors(validateChen(diagram))
  }, VALIDATION_DEBOUNCE_MS)

  const runInvariants = (diagram: Diagram) => {
    if (import.meta.env?.DEV !== true) return
    const violations = checkInvariants(diagram)
    if (violations.length > 0) {
      // Print each violation as its own line with ID + target + detail —
      // collapsed objects in the console hide the info that matters.
      for (const v of violations) {
        console.error(`[invariant ${v.invariantId}] target=${v.targetId} — ${v.detail}`)
      }
    }
  }

  const unsubscribe = useDiagramStore.subscribe(
    (s) => s.diagram,
    (diagram) => {
      runInvariants(diagram)
      runValidation(diagram)
    },
  )

  return unsubscribe
}
