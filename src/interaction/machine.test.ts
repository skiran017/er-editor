import { describe, it, expect, beforeEach } from 'vitest'
import { createActor } from 'xstate'
import { editorMachine } from './machine'
import { useDiagramStore } from '@/state/diagramStore'
import { useSelectionStore } from '@/state/selectionStore'
import { useViewportStore } from '@/state/viewportStore'
import { useUiStore } from '@/state/uiStore'
import { emptyDiagram } from '@/domain/types'
import { NO_MODIFIERS } from './events'

const resetStores = () => {
  useDiagramStore.setState({ diagram: emptyDiagram() })
  useDiagramStore.temporal.getState().clear()
  useSelectionStore.setState({
    selectedNodeIds: new Set(), selectedEdgeIds: new Set(), rubberband: null,
  })
  useViewportStore.setState({ zoom: 1, pan: { x: 0, y: 0 } })
  useUiStore.setState({ toasts: [] })
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

  // Attribute has separate, stricter semantics (must attach to a parent) and
  // is exercised in its own describe-block below.
  it.each([
    ['entity' as const, { placing: 'entity' as const }],
    ['relationship' as const, { placing: 'relationship' as const }],
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

describe('machine — placing.attribute (Chen semantics: needs a parent)', () => {
  beforeEach(resetStores)

  it('picking attribute tool + clicking an entity creates an attribute child with edge', () => {
    const entity = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'A', isWeak: false,
      position: { x: 100, y: 100 }, size: { width: 120, height: 60 },
    })
    const actor = startActor()
    actor.send({ type: 'PICK_TOOL', tool: 'attribute' })
    actor.send({
      type: 'NODE_POINTER_DOWN',
      nodeId: entity,
      point: { x: 160, y: 130 },
      modifiers: NO_MODIFIERS,
      button: 'left',
    })
    const d = useDiagramStore.getState().diagram
    const attrs = Object.values(d.nodesById).filter((n) => n.kind === 'attribute')
    expect(attrs).toHaveLength(1)
    const edges = Object.values(d.edgesById).filter((e) => e.kind === 'attribute-of')
    expect(edges).toHaveLength(1)
    // attribute-of edge flows FROM attribute TO parent:
    expect(edges[0]!.sourceId).toBe(attrs[0]!.id)
    expect(edges[0]!.targetId).toBe(entity)
    expect(actor.getSnapshot().matches({ selecting: 'idle' })).toBe(true)
    actor.stop()
  })

  it('picking attribute tool + clicking a relationship also creates an attribute child', () => {
    const rel = useDiagramStore.getState().addNode({
      kind: 'relationship', name: 'R', isIdentifying: false,
      position: { x: 0, y: 0 }, size: { width: 140, height: 70 },
    })
    const actor = startActor()
    actor.send({ type: 'PICK_TOOL', tool: 'attribute' })
    actor.send({
      type: 'NODE_POINTER_DOWN',
      nodeId: rel,
      point: { x: 50, y: 30 },
      modifiers: NO_MODIFIERS,
      button: 'left',
    })
    const d = useDiagramStore.getState().diagram
    expect(Object.values(d.nodesById).filter((n) => n.kind === 'attribute')).toHaveLength(1)
    expect(Object.values(d.edgesById).filter((e) => e.kind === 'attribute-of')).toHaveLength(1)
    expect(actor.getSnapshot().matches({ selecting: 'idle' })).toBe(true)
    actor.stop()
  })

  it('picking attribute tool + clicking an ISA is a no-op (stays in placing, no toast)', () => {
    const isa = useDiagramStore.getState().addNode({
      kind: 'isa', isTotal: false,
      position: { x: 0, y: 0 }, size: { width: 100, height: 60 },
    })
    const actor = startActor()
    actor.send({ type: 'PICK_TOOL', tool: 'attribute' })
    actor.send({
      type: 'NODE_POINTER_DOWN',
      nodeId: isa,
      point: { x: 50, y: 30 },
      modifiers: NO_MODIFIERS,
      button: 'left',
    })
    const d = useDiagramStore.getState().diagram
    expect(Object.values(d.nodesById).filter((n) => n.kind === 'attribute')).toHaveLength(0)
    expect(actor.getSnapshot().matches({ placing: 'attribute' })).toBe(true)
    actor.stop()
  })

  it('picking attribute tool + clicking empty canvas does not create an attribute, pushes a toast', () => {
    const actor = startActor()
    actor.send({ type: 'PICK_TOOL', tool: 'attribute' })
    actor.send({
      type: 'CANVAS_POINTER_DOWN',
      point: { x: 200, y: 200 },
      modifiers: NO_MODIFIERS,
      button: 'left',
    })
    actor.send({ type: 'CANVAS_POINTER_UP', point: { x: 200, y: 200 } })
    const d = useDiagramStore.getState().diagram
    expect(Object.values(d.nodesById).filter((n) => n.kind === 'attribute')).toHaveLength(0)
    const toasts = useUiStore.getState().toasts
    expect(toasts.some((t) => t.messageKey.includes('attributeNeedsParent'))).toBe(true)
    // Stays in placing so the user can then click a valid parent.
    expect(actor.getSnapshot().matches({ placing: 'attribute' })).toBe(true)
    actor.stop()
  })

  it('picking attribute tool + clicking an attribute creates a composite sub-attribute', () => {
    const parent = useDiagramStore.getState().addNode({
      kind: 'attribute', name: 'address',
      isKey: false, isDiscriminant: false, isMultivalued: false, isDerived: false, isComposite: true,
      position: { x: 0, y: 0 }, size: { width: 90, height: 50 },
    })
    const actor = startActor()
    actor.send({ type: 'PICK_TOOL', tool: 'attribute' })
    actor.send({
      type: 'NODE_POINTER_DOWN',
      nodeId: parent,
      point: { x: 50, y: 30 },
      modifiers: NO_MODIFIERS,
      button: 'left',
    })
    const attrs = Object.values(useDiagramStore.getState().diagram.nodesById).filter((n) => n.kind === 'attribute')
    expect(attrs).toHaveLength(2) // the parent + the new child
    const edges = Object.values(useDiagramStore.getState().diagram.edgesById).filter((e) => e.kind === 'attribute-of')
    expect(edges).toHaveLength(1)
    // The new (non-parent) attribute is the source.
    const child = attrs.find((a) => a.id !== parent)!
    expect(edges[0]!.sourceId).toBe(child.id)
    expect(edges[0]!.targetId).toBe(parent)
    actor.stop()
  })
})

