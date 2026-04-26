import { describe, it, expect, beforeEach } from 'vitest'
import { createActor } from 'xstate'
import { editorMachine } from './machine'
import { useDiagramStore } from '@/state/diagramStore'
import { useSelectionStore } from '@/state/selectionStore'
import { useViewportStore } from '@/state/viewportStore'
import { emptyDiagram } from '@/domain/types'
import { NO_MODIFIERS } from './events'

const resetStores = () => {
  useDiagramStore.setState({ diagram: emptyDiagram() })
  useDiagramStore.temporal.getState().clear()
  useSelectionStore.setState({
    selectedNodeIds: new Set(), selectedEdgeIds: new Set(), rubberband: null,
  })
  useViewportStore.setState({ zoom: 1, pan: { x: 0, y: 0 } })
}

const startActor = () => {
  const actor = createActor(editorMachine)
  actor.start()
  return actor
}

describe('machine — drawing', () => {
  beforeEach(resetStores)

  it('PICK_TOOL connect → drawing.idle', () => {
    const actor = startActor()
    actor.send({ type: 'PICK_TOOL', tool: 'connect' })
    expect(actor.getSnapshot().matches({ drawing: 'idle' })).toBe(true)
    actor.stop()
  })

  it('NODE_POINTER_DOWN picks source → drawing.connection.fromPicked', () => {
    const store = useDiagramStore.getState()
    const e = store.addNode({
      kind: 'entity', name: 'E', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const actor = startActor()
    actor.send({ type: 'PICK_TOOL', tool: 'connect' })
    actor.send({
      type: 'NODE_POINTER_DOWN', nodeId: e, point: { x: 0, y: 0 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    expect(actor.getSnapshot().matches({ drawing: { connection: 'fromPicked' } })).toBe(true)
    expect(actor.getSnapshot().context.connectionFromId).toBe(e)
    actor.stop()
  })

  it('NODE_POINTER_UP on target adds an edge and returns to drawing.idle', () => {
    const store = useDiagramStore.getState()
    const e = store.addNode({
      kind: 'entity', name: 'E', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const r = store.addNode({
      kind: 'relationship', name: 'R', isIdentifying: false,
      position: { x: 200, y: 0 }, size: { width: 140, height: 70 },
    })
    const actor = startActor()
    actor.send({ type: 'PICK_TOOL', tool: 'connect' })
    actor.send({
      type: 'NODE_POINTER_DOWN', nodeId: e, point: { x: 0, y: 0 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    actor.send({ type: 'NODE_POINTER_UP', nodeId: r, point: { x: 200, y: 0 } })
    expect(useDiagramStore.getState().diagram.edgeOrder).toHaveLength(1)
    expect(actor.getSnapshot().matches({ drawing: 'idle' })).toBe(true)
    actor.stop()
  })

  it('bubbling CANVAS_POINTER_DOWN/UP from a node click does NOT cancel the connection', () => {
    // RF v12 does not stop propagation on node pointer events, so a real
    // click on the TARGET node fires CANVAS_POINTER_DOWN + UP (via useMouse)
    // *before* React Flow's onNodeClick synthesises NODE_POINTER_DOWN. If
    // the machine cancelled on either of those, the target click would be
    // lost. The blank-pane cancel moved to the PANE_CLICK event (fired
    // exclusively from RF's onPaneClick callback).
    const store = useDiagramStore.getState()
    const e = store.addNode({
      kind: 'entity', name: 'E', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const actor = startActor()
    actor.send({ type: 'PICK_TOOL', tool: 'connect' })
    actor.send({
      type: 'NODE_POINTER_DOWN', nodeId: e, point: { x: 0, y: 0 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    actor.send({
      type: 'CANVAS_POINTER_DOWN', point: { x: 200, y: 200 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    actor.send({ type: 'CANVAS_POINTER_UP', point: { x: 200, y: 200 } })
    expect(actor.getSnapshot().matches({ drawing: { connection: 'fromPicked' } })).toBe(true)
    expect(actor.getSnapshot().context.connectionFromId).toBe(e)
    actor.stop()
  })

  it('PANE_CLICK from RF onPaneClick cancels the connection back to drawing.idle', () => {
    const e = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'E', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const actor = startActor()
    actor.send({ type: 'PICK_TOOL', tool: 'connect' })
    actor.send({
      type: 'NODE_POINTER_DOWN', nodeId: e, point: { x: 0, y: 0 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    actor.send({ type: 'PANE_CLICK', point: { x: 500, y: 500 } })
    expect(actor.getSnapshot().matches({ drawing: 'idle' })).toBe(true)
    expect(actor.getSnapshot().context.connectionFromId).toBeNull()
    expect(useDiagramStore.getState().diagram.edgeOrder).toHaveLength(0)
    actor.stop()
  })

  it('two-stage ESCAPE: first ESC from fromPicked cancels partial → drawing.idle (stays in connect tool)', () => {
    const e = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'E', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const actor = startActor()
    actor.send({ type: 'PICK_TOOL', tool: 'connect' })
    actor.send({
      type: 'NODE_POINTER_DOWN', nodeId: e, point: { x: 0, y: 0 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    actor.send({ type: 'ESCAPE' })
    expect(useDiagramStore.getState().diagram.edgeOrder).toHaveLength(0)
    expect(actor.getSnapshot().context.connectionFromId).toBeNull()
    // Still in the connect tool (drawing.idle), not back in selecting.
    expect(actor.getSnapshot().matches({ drawing: 'idle' })).toBe(true)
    actor.stop()
  })

  it('two-stage ESCAPE: second ESC from drawing.idle exits the tool to selecting and resets context.tool', () => {
    const actor = startActor()
    actor.send({ type: 'PICK_TOOL', tool: 'connect' })
    expect(actor.getSnapshot().matches({ drawing: 'idle' })).toBe(true)
    actor.send({ type: 'ESCAPE' })
    expect(actor.getSnapshot().matches('selecting')).toBe(true)
    // Tool field must flip back to 'select' so the toolbar highlight follows.
    expect(actor.getSnapshot().context.tool).toBe('select')
    actor.stop()
  })
})

describe('machine — quickRelationship', () => {
  beforeEach(resetStores)

  it('pick two entities → relationship + 2 edges added', () => {
    const store = useDiagramStore.getState()
    const a = store.addNode({
      kind: 'entity', name: 'A', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const b = store.addNode({
      kind: 'entity', name: 'B', isWeak: false,
      position: { x: 200, y: 0 }, size: { width: 120, height: 60 },
    })
    const actor = startActor()
    actor.send({ type: 'PICK_TOOL', tool: 'quickRelationship1N' })
    expect(actor.getSnapshot().matches({ quickRelationship: 'idle' })).toBe(true)

    actor.send({
      type: 'NODE_POINTER_DOWN', nodeId: a, point: { x: 0, y: 0 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    expect(actor.getSnapshot().matches({ quickRelationship: 'firstPicked' })).toBe(true)

    actor.send({
      type: 'NODE_POINTER_DOWN', nodeId: b, point: { x: 200, y: 0 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    const d = useDiagramStore.getState().diagram
    expect(d.nodeOrder).toHaveLength(3)
    expect(d.edgeOrder).toHaveLength(2)
    expect(actor.getSnapshot().matches({ quickRelationship: 'idle' })).toBe(true)
    actor.stop()
  })

  it('clicking the same node twice does not complete the flow', () => {
    const a = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'A', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const actor = startActor()
    actor.send({ type: 'PICK_TOOL', tool: 'quickRelationship1N' })
    actor.send({
      type: 'NODE_POINTER_DOWN', nodeId: a, point: { x: 0, y: 0 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    actor.send({
      type: 'NODE_POINTER_DOWN', nodeId: a, point: { x: 0, y: 0 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    expect(useDiagramStore.getState().diagram.nodeOrder).toHaveLength(1)
    expect(actor.getSnapshot().matches({ quickRelationship: 'firstPicked' })).toBe(true)
    actor.stop()
  })

  it('two-stage ESCAPE: first ESC from firstPicked cancels partial → quickRelationship.idle', () => {
    const a = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'A', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const actor = startActor()
    actor.send({ type: 'PICK_TOOL', tool: 'quickRelationship1N' })
    actor.send({
      type: 'NODE_POINTER_DOWN', nodeId: a, point: { x: 0, y: 0 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    expect(actor.getSnapshot().matches({ quickRelationship: 'firstPicked' })).toBe(true)
    actor.send({ type: 'ESCAPE' })
    expect(actor.getSnapshot().matches({ quickRelationship: 'idle' })).toBe(true)
    expect(actor.getSnapshot().context.quickFirstId).toBeNull()
    actor.stop()
  })

  it('two-stage ESCAPE: second ESC from quickRelationship.idle exits to selecting and resets context.tool', () => {
    const actor = startActor()
    actor.send({ type: 'PICK_TOOL', tool: 'quickRelationship1N' })
    actor.send({ type: 'ESCAPE' })
    expect(actor.getSnapshot().matches('selecting')).toBe(true)
    expect(actor.getSnapshot().context.tool).toBe('select')
    actor.stop()
  })
})

describe('machine — connectToGeneralization (right-click on ISA)', () => {
  beforeEach(resetStores)

  it('CONNECT_CHILD_TO_ISA transitions to connectToGeneralization.waitingForChild', () => {
    const isa = useDiagramStore.getState().addNode({
      kind: 'isa', isTotal: false,
      position: { x: 0, y: 0 }, size: { width: 100, height: 60 },
    })
    const actor = startActor()
    actor.send({ type: 'CONNECT_CHILD_TO_ISA', isaId: isa })
    expect(actor.getSnapshot().matches({ connectToGeneralization: 'waitingForChild' })).toBe(true)
    expect(actor.getSnapshot().context.connectionFromId).toBe(isa)
    actor.stop()
  })

  it('NODE_POINTER_DOWN on entity while waiting adds an isa-link edge and returns to idle', () => {
    const isa = useDiagramStore.getState().addNode({
      kind: 'isa', isTotal: false,
      position: { x: 0, y: 0 }, size: { width: 100, height: 60 },
    })
    const child = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'Sub', isWeak: false,
      position: { x: 200, y: 0 }, size: { width: 120, height: 60 },
    })
    const actor = startActor()
    actor.send({ type: 'CONNECT_CHILD_TO_ISA', isaId: isa })
    actor.send({
      type: 'NODE_POINTER_DOWN', nodeId: child, point: { x: 260, y: 30 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    const edges = Object.values(useDiagramStore.getState().diagram.edgesById)
      .filter((e) => e.kind === 'isa-link')
    expect(edges).toHaveLength(1)
    expect(edges[0]!.sourceId).toBe(isa)
    expect(edges[0]!.targetId).toBe(child)
    expect(edges[0]!.kind === 'isa-link' && edges[0]!.role).toBe('child')
    expect(actor.getSnapshot().matches({ selecting: 'idle' })).toBe(true)
    expect(actor.getSnapshot().context.connectionFromId).toBeNull()
    actor.stop()
  })

  it('ESCAPE from waitingForChild returns to idle without creating an edge', () => {
    const isa = useDiagramStore.getState().addNode({
      kind: 'isa', isTotal: false,
      position: { x: 0, y: 0 }, size: { width: 100, height: 60 },
    })
    const actor = startActor()
    actor.send({ type: 'CONNECT_CHILD_TO_ISA', isaId: isa })
    actor.send({ type: 'ESCAPE' })
    expect(Object.keys(useDiagramStore.getState().diagram.edgesById)).toHaveLength(0)
    expect(actor.getSnapshot().matches({ selecting: 'idle' })).toBe(true)
    expect(actor.getSnapshot().context.connectionFromId).toBeNull()
    actor.stop()
  })

  it('picking a non-entity (e.g. attribute) from waitingForChild is a no-op for edge creation', () => {
    const isa = useDiagramStore.getState().addNode({
      kind: 'isa', isTotal: false,
      position: { x: 0, y: 0 }, size: { width: 100, height: 60 },
    })
    const attr = useDiagramStore.getState().addNode({
      kind: 'attribute', name: 'x',
      isKey: false, isDiscriminant: false, isMultivalued: false, isDerived: false, isComposite: false,
      position: { x: 0, y: 100 }, size: { width: 90, height: 50 },
    })
    const actor = startActor()
    actor.send({ type: 'CONNECT_CHILD_TO_ISA', isaId: isa })
    actor.send({
      type: 'NODE_POINTER_DOWN', nodeId: attr, point: { x: 0, y: 100 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    const edges = Object.values(useDiagramStore.getState().diagram.edgesById)
      .filter((e) => e.kind === 'isa-link')
    expect(edges).toHaveLength(0)
    // Still transitions back to selecting.idle — the edge-creation guard sits inside the action.
    expect(actor.getSnapshot().matches({ selecting: 'idle' })).toBe(true)
    actor.stop()
  })
})

describe('machine — quickGeneralization', () => {
  beforeEach(resetStores)

  it('pick parent + child → isa node + 2 edges', () => {
    const store = useDiagramStore.getState()
    const p = store.addNode({
      kind: 'entity', name: 'P', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const c = store.addNode({
      kind: 'entity', name: 'C', isWeak: false,
      position: { x: 0, y: 200 }, size: { width: 120, height: 60 },
    })
    const actor = startActor()
    actor.send({ type: 'PICK_TOOL', tool: 'quickGeneralization' })
    expect(actor.getSnapshot().matches({ quickGeneralization: 'idle' })).toBe(true)

    actor.send({
      type: 'NODE_POINTER_DOWN', nodeId: p, point: { x: 0, y: 0 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    actor.send({
      type: 'NODE_POINTER_DOWN', nodeId: c, point: { x: 0, y: 200 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    const d = useDiagramStore.getState().diagram
    expect(d.nodeOrder).toHaveLength(3)
    expect(d.edgeOrder).toHaveLength(2)
    actor.stop()
  })

  it('two-stage ESCAPE: first ESC from firstPicked cancels partial → quickGeneralization.idle', () => {
    const p = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'P', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const actor = startActor()
    actor.send({ type: 'PICK_TOOL', tool: 'quickGeneralization' })
    actor.send({
      type: 'NODE_POINTER_DOWN', nodeId: p, point: { x: 0, y: 0 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    expect(actor.getSnapshot().matches({ quickGeneralization: 'firstPicked' })).toBe(true)
    actor.send({ type: 'ESCAPE' })
    expect(actor.getSnapshot().matches({ quickGeneralization: 'idle' })).toBe(true)
    expect(actor.getSnapshot().context.quickFirstId).toBeNull()
    actor.stop()
  })

  it('two-stage ESCAPE: second ESC from quickGeneralization.idle exits to selecting and resets context.tool', () => {
    const actor = startActor()
    actor.send({ type: 'PICK_TOOL', tool: 'quickGeneralization' })
    actor.send({ type: 'ESCAPE' })
    expect(actor.getSnapshot().matches('selecting')).toBe(true)
    expect(actor.getSnapshot().context.tool).toBe('select')
    actor.stop()
  })
})
