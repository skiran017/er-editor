import { enableMapSet } from 'immer'
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { NodeId, EdgeId, Point } from '@/domain/types'

enableMapSet()

export interface RubberbandState {
  readonly origin: Point
  readonly current: Point
}

export interface SelectionPayload {
  readonly nodes: readonly NodeId[]
  readonly edges: readonly EdgeId[]
}

export interface SelectionStoreState {
  readonly selectedNodeIds: ReadonlySet<NodeId>
  readonly selectedEdgeIds: ReadonlySet<EdgeId>
  readonly rubberband: RubberbandState | null
  select: (payload: SelectionPayload) => void
  toggle: (payload: SelectionPayload) => void
  clear: () => void
  startRubberband: (origin: Point) => void
  updateRubberband: (current: Point) => void
  commitRubberband: (payload: SelectionPayload) => void
  cancelRubberband: () => void
}

export const useSelectionStore = create<SelectionStoreState>()(
  subscribeWithSelector(
    immer((set) => ({
      selectedNodeIds: new Set<NodeId>(),
      selectedEdgeIds: new Set<EdgeId>(),
      rubberband: null,

      select: ({ nodes, edges }) => {
        set((state) => {
          state.selectedNodeIds = new Set(nodes)
          state.selectedEdgeIds = new Set(edges)
        })
      },

      toggle: ({ nodes, edges }) => {
        set((state) => {
          const nextN = new Set(state.selectedNodeIds)
          for (const id of nodes) {
            if (nextN.has(id)) nextN.delete(id)
            else nextN.add(id)
          }
          const nextE = new Set(state.selectedEdgeIds)
          for (const id of edges) {
            if (nextE.has(id)) nextE.delete(id)
            else nextE.add(id)
          }
          state.selectedNodeIds = nextN
          state.selectedEdgeIds = nextE
        })
      },

      clear: () => {
        set((state) => {
          state.selectedNodeIds = new Set()
          state.selectedEdgeIds = new Set()
        })
      },

      startRubberband: (origin) => {
        set((state) => {
          state.rubberband = { origin, current: origin }
        })
      },

      updateRubberband: (current) => {
        set((state) => {
          if (!state.rubberband) return
          state.rubberband = { origin: state.rubberband.origin, current }
        })
      },

      commitRubberband: ({ nodes, edges }) => {
        set((state) => {
          state.selectedNodeIds = new Set(nodes)
          state.selectedEdgeIds = new Set(edges)
          state.rubberband = null
        })
      },

      cancelRubberband: () => {
        set((state) => {
          state.rubberband = null
        })
      },
    })),
  ),
)
