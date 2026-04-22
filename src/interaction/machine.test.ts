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

describe('machine — initial state', () => {
  beforeEach(resetStores)
  it('starts in selecting.idle with select tool', () => {
    const actor = startActor()
    const s = actor.getSnapshot()
    expect(s.matches({ selecting: 'idle' })).toBe(true)
    expect(s.context.tool).toBe('select')
    actor.stop()
  })
})

describe('machine — PICK_TOOL routing', () => {
  beforeEach(resetStores)
  it.each([
    ['select', { selecting: 'idle' }] as const,
    ['pan', 'panning'] as const,
    ['entity', { placing: 'entity' }] as const,
    ['relationship', { placing: 'relationship' }] as const,
    ['attribute', { placing: 'attribute' }] as const,
    ['isa', { placing: 'isa' }] as const,
    ['connect', 'drawing'] as const,
    ['quickRelationship', 'quickRelationship'] as const,
    ['quickGeneralization', 'quickGeneralization'] as const,
  ])('PICK_TOOL %s → correct state', (tool, expected) => {
    const actor = startActor()
    actor.send({ type: 'PICK_TOOL', tool: tool as never })
    expect(actor.getSnapshot().matches(expected as never)).toBe(true)
    actor.stop()
  })
})

describe('machine — selecting.idle transitions', () => {
  beforeEach(resetStores)

  it('CANVAS_POINTER_DOWN left → rubberBand + starts rubberband in store', () => {
    const actor = startActor()
    actor.send({
      type: 'CANVAS_POINTER_DOWN', point: { x: 10, y: 10 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    expect(actor.getSnapshot().matches({ selecting: 'rubberBand' })).toBe(true)
    expect(useSelectionStore.getState().rubberband).toBeDefined()
    actor.stop()
  })

  it('CANVAS_POINTER_DOWN middle → panning', () => {
    const actor = startActor()
    actor.send({
      type: 'CANVAS_POINTER_DOWN', point: { x: 0, y: 0 },
      modifiers: NO_MODIFIERS, button: 'middle',
    })
    expect(actor.getSnapshot().matches('panning')).toBe(true)
    actor.stop()
  })

  it('NODE_POINTER_DOWN left → maybeDragging + node selected', () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'A', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const actor = startActor()
    actor.send({
      type: 'NODE_POINTER_DOWN', nodeId: id, point: { x: 5, y: 5 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    expect(actor.getSnapshot().matches({ selecting: 'maybeDragging' })).toBe(true)
    expect(useSelectionStore.getState().selectedNodeIds.has(id)).toBe(true)
    actor.stop()
  })
})

describe('machine — selecting.rubberBand transitions', () => {
  beforeEach(resetStores)

  it('CANVAS_POINTER_MOVE keeps state and updates rubberband', () => {
    const actor = startActor()
    actor.send({
      type: 'CANVAS_POINTER_DOWN', point: { x: 0, y: 0 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    actor.send({ type: 'CANVAS_POINTER_MOVE', point: { x: 50, y: 50 } })
    expect(actor.getSnapshot().matches({ selecting: 'rubberBand' })).toBe(true)
    expect(useSelectionStore.getState().rubberband?.current).toEqual({ x: 50, y: 50 })
    actor.stop()
  })

  it('CANVAS_POINTER_UP → idle + commits rubberband', () => {
    const actor = startActor()
    actor.send({
      type: 'CANVAS_POINTER_DOWN', point: { x: 0, y: 0 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    actor.send({ type: 'CANVAS_POINTER_UP', point: { x: 100, y: 100 } })
    expect(actor.getSnapshot().matches({ selecting: 'idle' })).toBe(true)
    expect(useSelectionStore.getState().rubberband).toBeNull()
    actor.stop()
  })
})

describe('machine — selecting.maybeDragging transitions', () => {
  beforeEach(resetStores)

  const setupDragCandidate = () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'A', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const actor = startActor()
    actor.send({
      type: 'NODE_POINTER_DOWN', nodeId: id, point: { x: 0, y: 0 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    return { actor, id }
  }

  it('CANVAS_POINTER_MOVE below threshold stays', () => {
    const { actor } = setupDragCandidate()
    actor.send({ type: 'CANVAS_POINTER_MOVE', point: { x: 1, y: 1 } })
    expect(actor.getSnapshot().matches({ selecting: 'maybeDragging' })).toBe(true)
    actor.stop()
  })

  it('CANVAS_POINTER_MOVE above threshold → dragging', () => {
    const { actor } = setupDragCandidate()
    actor.send({ type: 'CANVAS_POINTER_MOVE', point: { x: 10, y: 10 } })
    expect(actor.getSnapshot().matches({ selecting: 'dragging' })).toBe(true)
    actor.stop()
  })

  it('NODE_POINTER_UP without movement → idle', () => {
    const { actor, id } = setupDragCandidate()
    actor.send({ type: 'NODE_POINTER_UP', nodeId: id, point: { x: 0, y: 0 } })
    expect(actor.getSnapshot().matches({ selecting: 'idle' })).toBe(true)
    actor.stop()
  })
})

describe('machine — selecting.dragging transitions', () => {
  beforeEach(resetStores)

  it('CANVAS_POINTER_MOVE updates node position', () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'A', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const actor = startActor()
    actor.send({
      type: 'NODE_POINTER_DOWN', nodeId: id, point: { x: 0, y: 0 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    actor.send({ type: 'CANVAS_POINTER_MOVE', point: { x: 50, y: 50 } })
    expect(actor.getSnapshot().matches({ selecting: 'dragging' })).toBe(true)
    // Position is only updated while dragging; one more move should reflect it.
    actor.send({ type: 'CANVAS_POINTER_MOVE', point: { x: 100, y: 100 } })
    expect(useDiagramStore.getState().diagram.nodesById[id]!.position).toEqual({ x: 100, y: 100 })
    actor.stop()
  })

  it('CANVAS_POINTER_UP → idle', () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'A', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const actor = startActor()
    actor.send({
      type: 'NODE_POINTER_DOWN', nodeId: id, point: { x: 0, y: 0 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    actor.send({ type: 'CANVAS_POINTER_MOVE', point: { x: 50, y: 50 } })
    actor.send({ type: 'CANVAS_POINTER_UP', point: { x: 50, y: 50 } })
    expect(actor.getSnapshot().matches({ selecting: 'idle' })).toBe(true)
    actor.stop()
  })
})

describe('machine — top-level transitions from any state', () => {
  beforeEach(resetStores)

  it('ESCAPE from rubberBand → selecting.idle + resets context', () => {
    const actor = startActor()
    actor.send({
      type: 'CANVAS_POINTER_DOWN', point: { x: 0, y: 0 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    actor.send({ type: 'ESCAPE' })
    expect(actor.getSnapshot().matches({ selecting: 'idle' })).toBe(true)
    actor.stop()
  })

  it('UNDO applies to diagramStore', () => {
    const actor = startActor()
    useDiagramStore.getState().addNode({
      kind: 'entity', name: 'A', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    expect(useDiagramStore.getState().diagram.nodeOrder).toHaveLength(1)
    actor.send({ type: 'UNDO' })
    expect(useDiagramStore.getState().diagram.nodeOrder).toHaveLength(0)
    actor.stop()
  })

  it('WHEEL_ZOOM adjusts viewport', () => {
    const actor = startActor()
    actor.send({ type: 'WHEEL_ZOOM', anchor: { x: 100, y: 50 }, delta: 1 })
    expect(useViewportStore.getState().zoom).toBe(2)
    actor.stop()
  })

  it('NUDGE moves selection', () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'A', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    useSelectionStore.getState().select({ nodes: [id], edges: [] })
    const actor = startActor()
    actor.send({ type: 'NUDGE', dx: 5, dy: 3 })
    expect(useDiagramStore.getState().diagram.nodesById[id]!.position).toEqual({ x: 5, y: 3 })
    actor.stop()
  })
})

describe('machine — panning', () => {
  beforeEach(resetStores)

  it('PICK_TOOL pan → panning.idle', () => {
    const actor = startActor()
    actor.send({ type: 'PICK_TOOL', tool: 'pan' })
    expect(actor.getSnapshot().matches({ panning: 'idle' })).toBe(true)
    actor.stop()
  })

  it('CANVAS_POINTER_DOWN (any button) → panning.active', () => {
    const actor = startActor()
    actor.send({ type: 'PICK_TOOL', tool: 'pan' })
    actor.send({
      type: 'CANVAS_POINTER_DOWN', point: { x: 0, y: 0 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    expect(actor.getSnapshot().matches({ panning: 'active' })).toBe(true)
    actor.stop()
  })

  it('CANVAS_POINTER_MOVE while panning.active shifts viewport', () => {
    const actor = startActor()
    actor.send({ type: 'PICK_TOOL', tool: 'pan' })
    actor.send({
      type: 'CANVAS_POINTER_DOWN', point: { x: 0, y: 0 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    actor.send({ type: 'CANVAS_POINTER_MOVE', point: { x: 20, y: 30 } })
    const { pan } = useViewportStore.getState()
    expect(pan).toEqual({ x: 20, y: 30 })
    actor.stop()
  })

  it('CANVAS_POINTER_UP → panning.idle', () => {
    const actor = startActor()
    actor.send({ type: 'PICK_TOOL', tool: 'pan' })
    actor.send({
      type: 'CANVAS_POINTER_DOWN', point: { x: 0, y: 0 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    actor.send({ type: 'CANVAS_POINTER_UP', point: { x: 0, y: 0 } })
    expect(actor.getSnapshot().matches({ panning: 'idle' })).toBe(true)
    actor.stop()
  })
})

describe('machine — placing', () => {
  beforeEach(resetStores)

  it.each([
    ['entity' as const, { placing: 'entity' as const }],
    ['relationship' as const, { placing: 'relationship' as const }],
    ['attribute' as const, { placing: 'attribute' as const }],
    ['isa' as const, { placing: 'isa' as const }],
  ])('PICK_TOOL %s targets matching placing state and CANVAS_POINTER_UP adds a node', (tool, state) => {
    const actor = startActor()
    actor.send({ type: 'PICK_TOOL', tool })
    expect(actor.getSnapshot().matches(state)).toBe(true)
    actor.send({ type: 'CANVAS_POINTER_UP', point: { x: 42, y: 24 } })
    const d = useDiagramStore.getState().diagram
    expect(d.nodeOrder).toHaveLength(1)
    expect(d.nodesById[d.nodeOrder[0]!]!.kind).toBe(tool)
    expect(d.nodesById[d.nodeOrder[0]!]!.position).toEqual({ x: 42, y: 24 })
    actor.stop()
  })

  it('stays in placing state after a place for repeat-placement', () => {
    const actor = startActor()
    actor.send({ type: 'PICK_TOOL', tool: 'entity' })
    actor.send({ type: 'CANVAS_POINTER_UP', point: { x: 0, y: 0 } })
    expect(actor.getSnapshot().matches({ placing: 'entity' })).toBe(true)
    actor.stop()
  })
})
