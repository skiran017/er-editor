import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { ERCanvas } from './ERCanvas'
import { useDiagramStore } from '@/state/diagramStore'
import { useViewportStore } from '@/state/viewportStore'
import { useSelectionStore } from '@/state/selectionStore'
import { useValidationStore } from '@/state/validationStore'
import { useUiStore } from '@/state/uiStore'
import { useInteractionStore } from '@/interaction/interactionStore'
import { emptyDiagram } from '@/domain/types'
import { NO_MODIFIERS } from '@/interaction/events'

const resetAll = () => {
  useDiagramStore.setState({ diagram: emptyDiagram() })
  useDiagramStore.temporal.getState().clear()
  useViewportStore.setState({ zoom: 1, pan: { x: 0, y: 0 } })
  useSelectionStore.setState({ selectedNodeIds: new Set(), selectedEdgeIds: new Set(), rubberband: null })
  useValidationStore.setState({ errorsById: {}, enabled: false })
  useUiStore.getState().setSnap({
    gridEnabled: false, gridSize: 10, alignmentEnabled: true, alignmentThreshold: 4,
  })
  // Reset FSM to a known tool (select). `useInteractionStore.getState().send(...)`
  // is the Phase 3 API (see src/interaction/interactionStore.ts).
  useInteractionStore.getState().send({ type: 'PICK_TOOL', tool: 'select' })
}

beforeEach(resetAll)

describe('rendering integration — placement', () => {
  it('PICK_TOOL=entity + CANVAS_POINTER_DOWN + UP creates and renders an entity', async () => {
    render(<ERCanvas />)
    act(() => {
      const send = useInteractionStore.getState().send
      send({ type: 'PICK_TOOL', tool: 'entity' })
      send({
        type: 'CANVAS_POINTER_DOWN',
        point: { x: 100, y: 100 },
        modifiers: NO_MODIFIERS,
        button: 'left',
      })
      // `placeNode` in src/interaction/actions.ts fires on CANVAS_POINTER_UP.
      send({
        type: 'CANVAS_POINTER_UP',
        point: { x: 100, y: 100 },
      })
    })
    const diagram = useDiagramStore.getState().diagram
    expect(diagram.nodeOrder).toHaveLength(1)
    const entity = diagram.nodesById[diagram.nodeOrder[0]]
    expect(entity.kind).toBe('entity')
    // placeNode() assigns the default name 'Entity'.
    const node = entity as { name: string }
    expect(node.name).toBe('Entity')
    expect(await screen.findByText(node.name)).toBeInTheDocument()
  })
})

describe('rendering integration — store drives view', () => {
  it('after a store-level move, the canvas reflects the new position', async () => {
    const aId = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'A', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    useDiagramStore.getState().addNode({
      kind: 'entity', name: 'B', isWeak: false,
      position: { x: 300, y: 200 }, size: { width: 120, height: 60 },
    })
    render(<ERCanvas />)
    act(() => {
      useDiagramStore.getState().moveNode(aId, { x: 50, y: 50 })
    })
    const a = useDiagramStore.getState().diagram.nodesById[aId] as { position: { x: number; y: number } }
    expect(a.position).toEqual({ x: 50, y: 50 })
    expect(await screen.findByText('A')).toBeInTheDocument()
    expect(await screen.findByText('B')).toBeInTheDocument()
  })
})

describe('rendering integration — quick-relationship', () => {
  it('picking quickRelationship then two entities creates a relationship + two ER edges', () => {
    const a = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'A', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const b = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'B', isWeak: false,
      position: { x: 300, y: 0 }, size: { width: 120, height: 60 },
    })
    render(<ERCanvas />)
    act(() => {
      const send = useInteractionStore.getState().send
      send({ type: 'PICK_TOOL', tool: 'quickRelationship' })
      // `isLeftButton` guard on the quickRelationship transitions requires
      // `button: 'left'` on NODE_POINTER_DOWN (see src/interaction/machine.ts).
      send({
        type: 'NODE_POINTER_DOWN',
        nodeId: a,
        point: { x: 60, y: 30 },
        modifiers: NO_MODIFIERS,
        button: 'left',
      })
      send({
        type: 'NODE_POINTER_DOWN',
        nodeId: b,
        point: { x: 360, y: 30 },
        modifiers: NO_MODIFIERS,
        button: 'left',
      })
    })
    const d = useDiagramStore.getState().diagram
    const relationship = Object.values(d.nodesById).find((n) => n.kind === 'relationship')
    expect(relationship).toBeDefined()
    const erEdges = Object.values(d.edgesById).filter((e) => e.kind === 'entity-relationship')
    expect(erEdges).toHaveLength(2)
  })
})
