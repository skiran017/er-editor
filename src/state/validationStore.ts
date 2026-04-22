import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { NodeId, EdgeId, ValidationError } from '@/domain/types'

export interface ValidationStoreState {
  readonly errorsById: Readonly<Record<NodeId | EdgeId, readonly ValidationError[]>>
  readonly enabled: boolean
  setErrors: (errors: readonly ValidationError[]) => void
  setEnabled: (b: boolean) => void
  clear: () => void
}

export const useValidationStore = create<ValidationStoreState>()(
  subscribeWithSelector(
    persist(
      immer((set) => ({
        errorsById: {},
        enabled: true,

        setErrors: (errors) => {
          set((state) => {
            const next: Record<string, ValidationError[]> = {}
            for (const e of errors) {
              const key = e.targetId as string
              if (!next[key]) next[key] = []
              next[key].push(e)
            }
            state.errorsById = next
          })
        },

        setEnabled: (b) => set((state) => { state.enabled = b }),

        clear: () => set((state) => { state.errorsById = {} }),
      })),
      {
        name: 'er-editor:validation',
        partialize: (state) => ({ enabled: state.enabled }),
      },
    ),
  ),
)
