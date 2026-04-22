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

// Writeable view over Diagram. Domain types are deeply `readonly` so consumers
// can't mutate, but inside Immer drafts the same fields ARE mutable. Centralise
// the cast here; store actions work against `MutableDiagram` through `asMut`.
interface MutableDiagram {
  schemaVersion: 1
  nodesById: Record<NodeId, ERNode>
  edgesById: Record<EdgeId, ERLink>
  nodeOrder: NodeId[]
  edgeOrder: EdgeId[]
}

const asMut = (d: Diagram): MutableDiagram => d as unknown as MutableDiagram

// ——— pure-helper mutators (operate on MutableDiagram) ———

const addNodeInto = (d: MutableDiagram, node: ERNode): void => {
  d.nodesById[node.id] = node
  d.nodeOrder.push(node.id)
}

const updateNodeInto = (d: MutableDiagram, id: NodeId, patch: Partial<ERNode>): void => {
  const existing = d.nodesById[id]
  if (!existing) return
  d.nodesById[id] = { ...existing, ...patch } as ERNode
}

const addEdgeInto = (d: MutableDiagram, edge: ERLink): void => {
  d.edgesById[edge.id] = edge
  d.edgeOrder.push(edge.id)
}

const updateEdgeInto = (d: MutableDiagram, id: EdgeId, patch: Partial<ERLink>): void => {
  const existing = d.edgesById[id]
  if (!existing) return
  d.edgesById[id] = { ...existing, ...patch } as ERLink
}

const removeEdgeFrom = (d: MutableDiagram, id: EdgeId): void => {
  if (!d.edgesById[id]) return
  delete d.edgesById[id]
  d.edgeOrder = d.edgeOrder.filter((x) => x !== id)
}

const removeNodeFrom = (d: MutableDiagram, id: NodeId): void => {
  if (!d.nodesById[id]) return
  delete d.nodesById[id]
  d.nodeOrder = d.nodeOrder.filter((x) => x !== id)
  const keep: EdgeId[] = []
  for (const edgeId of d.edgeOrder) {
    const e = d.edgesById[edgeId]
    if (!e) continue
    if (e.sourceId === id || e.targetId === id) {
      delete d.edgesById[edgeId]
    } else {
      keep.push(edgeId)
    }
  }
  d.edgeOrder = keep
}

const applyPatchTo = (d: MutableDiagram, patch: DiagramPatch): void => {
  for (const id of patch.removeEdges ?? []) removeEdgeFrom(d, id)
  for (const id of patch.removeNodes ?? []) removeNodeFrom(d, id)
  for (const node of patch.addNodes ?? []) addNodeInto(d, node)
  for (const edge of patch.addEdges ?? []) addEdgeInto(d, edge)
  for (const { id, patch: p } of patch.updateNodes ?? []) updateNodeInto(d, id, p)
  for (const { id, patch: p } of patch.updateEdges ?? []) updateEdgeInto(d, id, p)
}

const reorderTo = (
  d: MutableDiagram,
  id: NodeId | EdgeId,
  mode: 'front' | 'back',
): void => {
  if (d.nodesById[id as NodeId]) {
    d.nodeOrder = d.nodeOrder.filter((x) => x !== id)
    if (mode === 'front') d.nodeOrder.push(id as NodeId)
    else d.nodeOrder.unshift(id as NodeId)
  } else if (d.edgesById[id as EdgeId]) {
    d.edgeOrder = d.edgeOrder.filter((x) => x !== id)
    if (mode === 'front') d.edgeOrder.push(id as EdgeId)
    else d.edgeOrder.unshift(id as EdgeId)
  }
}

// ——— public store ———

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
            addNodeInto(asMut(state.diagram), node)
          })
          return id
        },

        updateNode: (id, patch) => {
          set((state) => { updateNodeInto(asMut(state.diagram), id, patch) })
        },

        moveNode: (id, to) => {
          set((state) => {
            const n = asMut(state.diagram).nodesById[id]
            if (!n) return
            ;(n as { position: Point }).position = to
          })
        },

        resizeNode: (id, to) => {
          set((state) => {
            const n = asMut(state.diagram).nodesById[id]
            if (!n) return
            ;(n as { size: Size }).size = to
          })
        },

        removeNode: (id) => {
          set((state) => { removeNodeFrom(asMut(state.diagram), id) })
        },

        addEdge: (input) => {
          const id = newEdgeId()
          set((state) => {
            const edge = { ...input, id } as ERLink
            addEdgeInto(asMut(state.diagram), edge)
          })
          return id
        },

        updateEdge: (id, patch) => {
          set((state) => { updateEdgeInto(asMut(state.diagram), id, patch) })
        },

        setWaypoints: (id, waypoints) => {
          set((state) => {
            const e = asMut(state.diagram).edgesById[id]
            if (!e) return
            ;(e as unknown as { waypoints: Point[] }).waypoints = [...waypoints]
          })
        },

        removeEdge: (id) => {
          set((state) => { removeEdgeFrom(asMut(state.diagram), id) })
        },

        applyPatch: (patch) => {
          set((state) => { applyPatchTo(asMut(state.diagram), patch) })
        },

        replaceDiagram: (next) => {
          set((state) => {
            ;(state as { diagram: Diagram }).diagram = next
          })
          useDiagramStore.temporal.getState().clear()
        },

        bringToFront: (id) => {
          set((state) => { reorderTo(asMut(state.diagram), id, 'front') })
        },

        sendToBack: (id) => {
          set((state) => { reorderTo(asMut(state.diagram), id, 'back') })
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
