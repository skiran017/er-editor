import { newNodeId } from '@/domain/id'
import { useDiagramStore } from './diagramStore'
import { useSelectionStore } from './selectionStore'

export const deleteSelection = (): void => {
  const sel = useSelectionStore.getState()
  const nodes = [...sel.selectedNodeIds]
  const edges = [...sel.selectedEdgeIds]
  if (nodes.length === 0 && edges.length === 0) return
  useDiagramStore.getState().applyPatch({ removeNodes: nodes, removeEdges: edges })
  useSelectionStore.getState().clear()
}

export const duplicateSelection = (): void => {
  const sel = useSelectionStore.getState()
  const ids = [...sel.selectedNodeIds]
  if (ids.length === 0) return
  const source = useDiagramStore.getState().diagram
  const copies = ids
    .map((id) => source.nodesById[id])
    .filter((n): n is NonNullable<typeof n> => !!n)
    .map((n) => {
      const newId = newNodeId()
      return { ...n, id: newId, position: { x: n.position.x + 16, y: n.position.y + 16 } }
    })
  useDiagramStore.getState().applyPatch({ addNodes: copies })
  useSelectionStore.getState().select({ nodes: copies.map((c) => c.id), edges: [] })
}

export const selectAll = (): void => {
  const d = useDiagramStore.getState().diagram
  useSelectionStore.getState().select({ nodes: [...d.nodeOrder], edges: [...d.edgeOrder] })
}

export const clearSelection = (): void => {
  useSelectionStore.getState().clear()
}
