import { describe, it, expect, beforeEach } from 'vitest'
import { placeNode, nudgeSelection, deleteSelectionAction, undoAction } from './actions'
import { initialContext } from './context'
import { useDiagramStore } from '@/state/diagramStore'
import { useSelectionStore } from '@/state/selectionStore'
import { useUiStore } from '@/state/uiStore'
import { emptyDiagram, type NodeId } from '@/domain/types'

beforeEach(() => {
  useDiagramStore.setState({ diagram: emptyDiagram() })
  useDiagramStore.temporal.getState().clear()
  useSelectionStore.setState({
    selectedNodeIds: new Set(), selectedEdgeIds: new Set(), rubberband: null,
  })
  useUiStore.setState({ readonly: false })
})

const seedEntityAndSelect = (): NodeId => {
  const id = useDiagramStore.getState().addNode({
    kind: 'entity', name: 'E', isWeak: false,
    position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
  })
  useSelectionStore.setState({ selectedNodeIds: new Set([id]) })
  return id
}

describe('actions — readonly gate', () => {
  it('placeNode does nothing when readonly is true', () => {
    useUiStore.setState({ readonly: true })
    placeNode(
      { ...initialContext, tool: 'entity' },
      { type: 'CANVAS_POINTER_UP', point: { x: 0, y: 0 } },
    )
    expect(useDiagramStore.getState().diagram.nodeOrder).toHaveLength(0)
  })

  it('deleteSelectionAction leaves the selected node alive when readonly is true', () => {
    const id = seedEntityAndSelect()
    useUiStore.setState({ readonly: true })

    deleteSelectionAction(initialContext, { type: 'DELETE' })

    expect(useDiagramStore.getState().diagram.nodeOrder).toContain(id)
  })

  it('nudgeSelection does not move the selected node when readonly is true', () => {
    const id = seedEntityAndSelect()
    useUiStore.setState({ readonly: true })

    nudgeSelection(initialContext, { type: 'NUDGE', dx: 10, dy: 10 })

    expect(useDiagramStore.getState().diagram.nodesById[id]!.position).toEqual({ x: 0, y: 0 })
  })

  it('undoAction does not rewind history when readonly is true', () => {
    // Seed an entity (this is one history step).
    const id = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'E', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    expect(useDiagramStore.getState().diagram.nodeOrder).toContain(id)

    useUiStore.setState({ readonly: true })

    undoAction(initialContext, { type: 'UNDO' })

    // Without the gate, undo would have removed the entity. With the gate,
    // the diagram is unchanged.
    expect(useDiagramStore.getState().diagram.nodeOrder).toContain(id)
  })

  it('with readonly false, placeNode still works (sanity — gate is scoped)', () => {
    placeNode(
      { ...initialContext, tool: 'entity' },
      { type: 'CANVAS_POINTER_UP', point: { x: 50, y: 50 } },
    )
    expect(useDiagramStore.getState().diagram.nodeOrder).toHaveLength(1)
  })
})
