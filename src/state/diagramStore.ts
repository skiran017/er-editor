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

        applyPatch: (patch) => {
          set((state) => {
            for (const id of patch.removeEdges ?? []) {
              delete (state.diagram.edgesById as Record<EdgeId, ERLink>)[id]
              ;(state.diagram as { edgeOrder: EdgeId[] }).edgeOrder =
                (state.diagram.edgeOrder as EdgeId[]).filter((x) => x !== id)
            }
            for (const id of patch.removeNodes ?? []) {
              if (!state.diagram.nodesById[id]) continue
              delete (state.diagram.nodesById as Record<NodeId, ERNode>)[id]
              ;(state.diagram as { nodeOrder: NodeId[] }).nodeOrder =
                (state.diagram.nodeOrder as NodeId[]).filter((x) => x !== id)
              const keep: EdgeId[] = []
              for (const edgeId of state.diagram.edgeOrder) {
                const e = state.diagram.edgesById[edgeId]
                if (!e) continue
                if (e.sourceId === id || e.targetId === id) {
                  delete (state.diagram.edgesById as Record<EdgeId, ERLink>)[edgeId]
                } else {
                  keep.push(edgeId)
                }
              }
              ;(state.diagram as { edgeOrder: EdgeId[] }).edgeOrder = keep
            }
            for (const node of patch.addNodes ?? []) {
              ;(state.diagram.nodesById as Record<NodeId, ERNode>)[node.id] = node
              ;(state.diagram.nodeOrder as NodeId[]).push(node.id)
            }
            for (const edge of patch.addEdges ?? []) {
              ;(state.diagram.edgesById as Record<EdgeId, ERLink>)[edge.id] = edge
              ;(state.diagram.edgeOrder as EdgeId[]).push(edge.id)
            }
            for (const { id, patch: p } of patch.updateNodes ?? []) {
              const existing = state.diagram.nodesById[id]
              if (!existing) continue
              ;(state.diagram.nodesById as Record<NodeId, ERNode>)[id] = { ...existing, ...p } as ERNode
            }
            for (const { id, patch: p } of patch.updateEdges ?? []) {
              const existing = state.diagram.edgesById[id]
              if (!existing) continue
              ;(state.diagram.edgesById as Record<EdgeId, ERLink>)[id] = { ...existing, ...p } as ERLink
            }
          })
        },

        replaceDiagram: (next) => {
          set((state) => {
            ;(state as { diagram: Diagram }).diagram = next
          })
          useDiagramStore.temporal.getState().clear()
        },

        bringToFront: (id) => {
          set((state) => {
            if (state.diagram.nodesById[id as NodeId]) {
              ;(state.diagram as { nodeOrder: NodeId[] }).nodeOrder =
                (state.diagram.nodeOrder as NodeId[]).filter((x) => x !== id)
              ;(state.diagram.nodeOrder as NodeId[]).push(id as NodeId)
            } else if (state.diagram.edgesById[id as EdgeId]) {
              ;(state.diagram as { edgeOrder: EdgeId[] }).edgeOrder =
                (state.diagram.edgeOrder as EdgeId[]).filter((x) => x !== id)
              ;(state.diagram.edgeOrder as EdgeId[]).push(id as EdgeId)
            }
          })
        },

        sendToBack: (id) => {
          set((state) => {
            if (state.diagram.nodesById[id as NodeId]) {
              ;(state.diagram as { nodeOrder: NodeId[] }).nodeOrder =
                (state.diagram.nodeOrder as NodeId[]).filter((x) => x !== id)
              ;(state.diagram.nodeOrder as NodeId[]).unshift(id as NodeId)
            } else if (state.diagram.edgesById[id as EdgeId]) {
              ;(state.diagram as { edgeOrder: EdgeId[] }).edgeOrder =
                (state.diagram.edgeOrder as EdgeId[]).filter((x) => x !== id)
              ;(state.diagram.edgeOrder as EdgeId[]).unshift(id as EdgeId)
            }
          })
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
