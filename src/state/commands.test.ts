import { describe, it, expect, beforeEach } from 'vitest'
import { useDiagramStore } from './diagramStore'
import { useSelectionStore } from './selectionStore'
import { deleteSelection, duplicateSelection, selectAll, clearSelection } from './commands'
import { emptyDiagram } from '@/domain/types'
import type { NodeInput } from './types'

const entity = (name = 'E'): Extract<NodeInput, { kind: 'entity' }> => ({
  kind: 'entity', name, isWeak: false,
  position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
})

const reset = () => {
  useDiagramStore.setState({ diagram: emptyDiagram() })
  useDiagramStore.temporal.getState().clear()
  useSelectionStore.setState({
    selectedNodeIds: new Set(), selectedEdgeIds: new Set(), rubberband: null,
  })
}

describe('commands — deleteSelection', () => {
  beforeEach(reset)
  it('removes selected nodes in a single undo step', () => {
    const store = useDiagramStore.getState()
    const a = store.addNode(entity('A'))
    const b = store.addNode(entity('B'))
    const c = store.addNode(entity('C'))
    useSelectionStore.getState().select({ nodes: [a, b], edges: [] })
    useDiagramStore.temporal.getState().clear()

    deleteSelection()
    expect(useDiagramStore.getState().diagram.nodeOrder).toEqual([c])

    useDiagramStore.temporal.getState().undo()
    expect([...useDiagramStore.getState().diagram.nodeOrder].sort()).toEqual([a, b, c].sort())
  })
})

describe('commands — duplicateSelection', () => {
  beforeEach(reset)
  it('adds duplicates offset by 16px in a single undo step', () => {
    const store = useDiagramStore.getState()
    const a = store.addNode(entity('A'))
    useSelectionStore.getState().select({ nodes: [a], edges: [] })
    useDiagramStore.temporal.getState().clear()

    duplicateSelection()
    const d = useDiagramStore.getState().diagram
    expect(d.nodeOrder).toHaveLength(2)
    const dup = d.nodesById[d.nodeOrder[1]!]!
    expect(dup.position).toEqual({ x: 16, y: 16 })

    useDiagramStore.temporal.getState().undo()
    expect(useDiagramStore.getState().diagram.nodeOrder).toEqual([a])
  })
})

describe('commands — selectAll / clearSelection', () => {
  beforeEach(reset)
  it('selectAll populates selectionStore with every node + edge', () => {
    const store = useDiagramStore.getState()
    const a = store.addNode(entity('A'))
    const b = store.addNode(entity('B'))
    selectAll()
    const sel = useSelectionStore.getState()
    expect([...sel.selectedNodeIds].sort()).toEqual([a, b].sort())
  })
  it('clearSelection empties both sets', () => {
    const store = useDiagramStore.getState()
    const a = store.addNode(entity('A'))
    useSelectionStore.getState().select({ nodes: [a], edges: [] })
    clearSelection()
    expect(useSelectionStore.getState().selectedNodeIds.size).toBe(0)
  })
})
