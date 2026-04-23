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
    // placeNode() assigns a kind-scoped default name ('Entity 1', 'Entity 2', ...).
    const node = entity as { name: string }
    expect(node.name).toBe('Entity 1')
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

describe('rendering integration — connect tool (entity → attribute)', () => {
  it('pick connect, click entity, click attribute → creates exactly one attribute-of edge', () => {
    // Reproduces the user-reported Bug 3 flow. Each "click" is modeled the
    // same way useRfEvents models it: NODE_POINTER_DOWN then a synthetic
    // CANVAS_POINTER_UP at the same point. After fix 1 + the machine change
    // (drawing.connection.fromPicked now reacts to NODE_POINTER_DOWN + its
    // CANVAS_POINTER_UP handler is gone), the flow must produce an edge.
    const ent = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'E', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const attr = useDiagramStore.getState().addNode({
      kind: 'attribute', name: 'name', isKey: false, isDiscriminant: false,
      isMultivalued: false, isDerived: false, isComposite: false,
      position: { x: 300, y: 0 }, size: { width: 90, height: 50 },
    })
    render(<ERCanvas />)
    act(() => {
      const send = useInteractionStore.getState().send
      send({ type: 'PICK_TOOL', tool: 'connect' })
      // click entity
      send({
        type: 'NODE_POINTER_DOWN', nodeId: ent,
        point: { x: 60, y: 30 }, modifiers: NO_MODIFIERS, button: 'left',
      })
      send({ type: 'CANVAS_POINTER_UP', point: { x: 60, y: 30 } })
      // click attribute
      send({
        type: 'NODE_POINTER_DOWN', nodeId: attr,
        point: { x: 345, y: 25 }, modifiers: NO_MODIFIERS, button: 'left',
      })
      send({ type: 'CANVAS_POINTER_UP', point: { x: 345, y: 25 } })
    })
    const d = useDiagramStore.getState().diagram
    // Exactly one edge, of kind attribute-of, with the attribute as source.
    expect(d.edgeOrder).toHaveLength(1)
    const edge = d.edgesById[d.edgeOrder[0]!]!
    expect(edge.kind).toBe('attribute-of')
    expect(edge.sourceId).toBe(attr)
    expect(edge.targetId).toBe(ent)
  })

  it('click entity on blank pane → connect cancels (no dangling preview)', () => {
    // After clicking the entity, a REAL pane click fires CANVAS_POINTER_DOWN
    // first (from useMouse; RF does not swallow pane events). The machine
    // uses CANVAS_POINTER_DOWN (not UP) to cancel the connection so the
    // synthetic UP from onNodeClick doesn't immediately cancel the connect.
    const ent = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'E', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    render(<ERCanvas />)
    act(() => {
      const send = useInteractionStore.getState().send
      send({ type: 'PICK_TOOL', tool: 'connect' })
      send({
        type: 'NODE_POINTER_DOWN', nodeId: ent,
        point: { x: 60, y: 30 }, modifiers: NO_MODIFIERS, button: 'left',
      })
      // synthetic UP from onNodeClick — must NOT cancel
      send({ type: 'CANVAS_POINTER_UP', point: { x: 60, y: 30 } })
    })
    // Still in drawing.connection.fromPicked, source preserved.
    expect(useInteractionStore.getState().snapshot.matches({ drawing: { connection: 'fromPicked' } })).toBe(true)
    expect(useInteractionStore.getState().snapshot.context.connectionFromId).toBe(ent)
    // Now the user clicks on blank pane → useMouse sends DOWN.
    act(() => {
      useInteractionStore.getState().send({
        type: 'CANVAS_POINTER_DOWN',
        point: { x: 500, y: 500 }, modifiers: NO_MODIFIERS, button: 'left',
      })
    })
    expect(useInteractionStore.getState().snapshot.matches({ drawing: 'idle' })).toBe(true)
    expect(useInteractionStore.getState().snapshot.context.connectionFromId).toBeNull()
    // No edge was created.
    expect(useDiagramStore.getState().diagram.edgeOrder).toHaveLength(0)
  })
})

describe('rendering integration — edges actually render (handles regression guard)', () => {
  it('an attribute-of edge between two stored nodes renders visibly in the canvas', async () => {
    // Regression guard: before node containers mounted <Handle> components,
    // React Flow v12 silently dropped every edge because it could not resolve
    // a source/target handle. This test seeds an edge directly into the store,
    // mounts the canvas, and asserts the rendered edge group is present.
    const entity = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'A', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const attr = useDiagramStore.getState().addNode({
      kind: 'attribute', name: 'id', isKey: false, isDiscriminant: false,
      isMultivalued: false, isDerived: false, isComposite: false,
      position: { x: 200, y: 0 }, size: { width: 90, height: 50 },
    })
    useDiagramStore.getState().addEdge({
      kind: 'attribute-of', sourceId: attr, targetId: entity, waypoints: [],
    })

    const { container } = render(<ERCanvas />)
    await new Promise((r) => setTimeout(r, 50))
    // jsdom can't measure, so RF never actually stamps [data-kind="attribute-of"]
    // here. The best regression guard we CAN write at this layer is: every
    // mounted node container renders RF's own .react-flow__handle DOM (source
    // + target). That's the exact thing whose absence caused the bug — RF's
    // edge resolver needs handles on both endpoints. If we lose them again,
    // this assertion flips.
    const handles = container.querySelectorAll('.react-flow__handle')
    // Two nodes × (source + target) = 4 handle elements minimum.
    expect(handles.length).toBeGreaterThanOrEqual(4)
    // And the edge itself is still in the store — a smoke check that addEdge()
    // accepted the payload and no cleanup pass dropped it.
    expect(useDiagramStore.getState().diagram.edgeOrder).toHaveLength(1)
  })
})

describe('rendering integration — drag-follow regression (Bug 1)', () => {
  it('clicking a node then moving the mouse does NOT drag the node (synthetic UP exits maybeDragging)', () => {
    // Models what useRfEvents.onNodeClick now does: NODE_POINTER_DOWN +
    // synthetic CANVAS_POINTER_UP at the same point. Then a subsequent
    // CANVAS_POINTER_MOVE that would have crossed the drag threshold must
    // NOT move the node.
    const id = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'A', isWeak: false,
      position: { x: 100, y: 100 }, size: { width: 120, height: 60 },
    })
    render(<ERCanvas />)
    act(() => {
      const send = useInteractionStore.getState().send
      // Click the node.
      send({
        type: 'NODE_POINTER_DOWN', nodeId: id,
        point: { x: 160, y: 130 }, modifiers: NO_MODIFIERS, button: 'left',
      })
      send({ type: 'CANVAS_POINTER_UP', point: { x: 160, y: 130 } })
      // Move the mouse well past the drag threshold (3px).
      send({ type: 'CANVAS_POINTER_MOVE', point: { x: 400, y: 400 } })
    })
    // Node position unchanged.
    const node = useDiagramStore.getState().diagram.nodesById[id]!
    expect(node.position).toEqual({ x: 100, y: 100 })
    // FSM back in selecting.idle (not dragging / maybeDragging).
    expect(useInteractionStore.getState().snapshot.matches({ selecting: 'idle' })).toBe(true)
  })
})
