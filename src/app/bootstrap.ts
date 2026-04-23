import { useDiagramStore } from '@/state/diagramStore'
import { useValidationStore } from '@/state/validationStore'
import { useUiStore } from '@/state/uiStore'
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

  const unsubscribeDiagram = useDiagramStore.subscribe(
    (s) => s.diagram,
    (diagram) => {
      runInvariants(diagram)
      runValidation(diagram)
    },
  )

  // Flipping the validation switch in the menu must take effect immediately,
  // not on the next diagram edit. Off → clear stale errors so badges vanish.
  // On → recompute against the current diagram so badges reappear.
  const unsubscribeValidationToggle = useValidationStore.subscribe(
    (s) => s.enabled,
    (enabled) => {
      if (enabled) {
        useValidationStore.getState().setErrors(
          validateChen(useDiagramStore.getState().diagram),
        )
      } else {
        useValidationStore.getState().clear()
      }
    },
  )

  // Entering exam mode forces validation OFF (and the Menu further locks the
  // toggle disabled): students shouldn't see rule-violation hints during an
  // exam. The validation-toggle subscriber above then clears the error store
  // so badges disappear immediately. Leaving exam mode does NOT auto-flip
  // validation back on — the flag stays as-is so the user can re-enable it
  // intentionally.
  const unsubscribeExamMode = useUiStore.subscribe(
    (s) => s.examMode,
    (on) => {
      if (on) useValidationStore.getState().setEnabled(false)
    },
  )

  return () => {
    unsubscribeDiagram()
    unsubscribeValidationToggle()
    unsubscribeExamMode()
  }
}
