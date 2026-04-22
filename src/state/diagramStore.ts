import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { temporal } from 'zundo'
import { emptyDiagram } from '@/domain/types'
import { newNodeId, newEdgeId } from '@/domain/id'
import type {
  Diagram, ERNode, ERLink, NodeId, EdgeId, Point, Size,
} from '@/domain/types'
import type { NodeInput, EdgeInput, DiagramPatch } from './types'

export interface DiagramStoreState {
  readonly diagram: Diagram
  // Node operations
  addNode: (input: NodeInput) => NodeId
  updateNode: (id: NodeId, patch: Partial<ERNode>) => void
  moveNode: (id: NodeId, to: Point) => void
  resizeNode: (id: NodeId, to: Size) => void
  removeNode: (id: NodeId) => void
  // Edge operations
  addEdge: (input: EdgeInput) => EdgeId
  updateEdge: (id: EdgeId, patch: Partial<ERLink>) => void
  setWaypoints: (id: EdgeId, waypoints: readonly Point[]) => void
  removeEdge: (id: EdgeId) => void
  // Bulk / transactional
  applyPatch: (patch: DiagramPatch) => void
  replaceDiagram: (next: Diagram) => void
  // Z-order
  bringToFront: (id: NodeId | EdgeId) => void
  sendToBack: (id: NodeId | EdgeId) => void
}

export const useDiagramStore = create<DiagramStoreState>()(
  subscribeWithSelector(
    temporal(
      immer((set) => ({
        diagram: emptyDiagram(),

        addNode: (input) => {
          const id = newNodeId()
          set((state) => {
            const node = { ...input, id } as ERNode
            ;(state.diagram.nodesById as Record<NodeId, ERNode>)[id] = node
            ;(state.diagram.nodeOrder as NodeId[]).push(id)
          })
          return id
        },

        updateNode: (id, patch) => {
          set((state) => {
            const existing = state.diagram.nodesById[id]
            if (!existing) return
            ;(state.diagram.nodesById as Record<NodeId, ERNode>)[id] = { ...existing, ...patch } as ERNode
          })
        },

        moveNode: (id, to) => {
          set((state) => {
            const n = (state.diagram.nodesById as Record<NodeId, ERNode>)[id]
            if (!n) return
            ;(n as { position: Point }).position = to
          })
        },

        resizeNode: (id, to) => {
          set((state) => {
            const n = (state.diagram.nodesById as Record<NodeId, ERNode>)[id]
            if (!n) return
            ;(n as { size: Size }).size = to
          })
        },

        removeNode: (id) => {
          set((state) => {
            if (!state.diagram.nodesById[id]) return
            delete (state.diagram.nodesById as Record<NodeId, ERNode>)[id]
            ;(state.diagram as { nodeOrder: NodeId[] }).nodeOrder = (state.diagram.nodeOrder as NodeId[]).filter((x) => x !== id)
            const keepEdges: EdgeId[] = []
            for (const edgeId of state.diagram.edgeOrder) {
              const e = state.diagram.edgesById[edgeId]
              if (!e) continue
              if (e.sourceId === id || e.targetId === id) {
                delete (state.diagram.edgesById as Record<EdgeId, ERLink>)[edgeId]
              } else {
                keepEdges.push(edgeId)
              }
            }
            ;(state.diagram as { edgeOrder: EdgeId[] }).edgeOrder = keepEdges
          })
        },

        // ——— edge operations, bulk, z-order: added in Tasks 4 + 5 ———

        addEdge: (input) => {
          const id = newEdgeId()
          set((state) => {
            const edge = { ...input, id } as ERLink
            ;(state.diagram.edgesById as Record<EdgeId, ERLink>)[id] = edge
            ;(state.diagram.edgeOrder as EdgeId[]).push(id)
          })
          return id
        },

        updateEdge: (id, patch) => {
          set((state) => {
            const existing = state.diagram.edgesById[id]
            if (!existing) return
            ;(state.diagram.edgesById as Record<EdgeId, ERLink>)[id] = { ...existing, ...patch } as ERLink
          })
        },

        setWaypoints: (id, waypoints) => {
          set((state) => {
            const e = (state.diagram.edgesById as Record<EdgeId, ERLink>)[id]
            if (!e) return
            ;(e as unknown as { waypoints: Point[] }).waypoints = [...waypoints]
          })
        },

        removeEdge: (id) => {
          set((state) => {
            if (!state.diagram.edgesById[id]) return
            delete (state.diagram.edgesById as Record<EdgeId, ERLink>)[id]
            ;(state.diagram as { edgeOrder: EdgeId[] }).edgeOrder = (state.diagram.edgeOrder as EdgeId[]).filter((x) => x !== id)
          })
        },

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        applyPatch: (_patch) => {
          // Implemented in Task 5.
        },

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        replaceDiagram: (_next) => {
          // Implemented in Task 5.
        },

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        bringToFront: (_id) => {
          // Implemented in Task 5.
        },

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        sendToBack: (_id) => {
          // Implemented in Task 5.
        },
      })),
      {
        limit: 100,
        partialize: (state) => ({ diagram: state.diagram }),
        equality: (a, b) => a.diagram === b.diagram,
      },
    ),
  ),
)
