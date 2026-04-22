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

  it('CANVAS_POINTER_UP on empty canvas cancels back to drawing.idle', () => {
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
    actor.send({ type: 'CANVAS_POINTER_UP', point: { x: 200, y: 200 } })
    expect(useDiagramStore.getState().diagram.edgeOrder).toHaveLength(0)
    expect(actor.getSnapshot().matches({ drawing: 'idle' })).toBe(true)
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
    actor.send({ type: 'PICK_TOOL', tool: 'quickRelationship' })
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
    actor.send({ type: 'PICK_TOOL', tool: 'quickRelationship' })
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
})
