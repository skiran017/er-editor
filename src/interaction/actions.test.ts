import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  placeNode, moveDraggedNode, connectNodes, beginRubberband,
  updateRubberbandAction, commitRubberbandAction, selectNodeFromEvent,
  panViewportAction, zoomAtPointAction, nudgeSelection,
  undoAction, redoAction, deleteSelectionAction, duplicateSelectionAction,
  selectAllAction, clearSelectionAction,
  stubCopy, stubCut, stubPaste, toggleCheatsheetAction,
} from './actions'
import { useDiagramStore } from '@/state/diagramStore'
import { useViewportStore } from '@/state/viewportStore'
import { useSelectionStore } from '@/state/selectionStore'
import { useUiStore } from '@/state/uiStore'
import { emptyDiagram } from '@/domain/types'
import { asNodeId } from '@/domain/id'
import { initialContext, type EditorContext } from './context'
import type { EditorEvent } from './events'
import { NO_MODIFIERS } from './events'

const withContext = (patch: Partial<EditorContext> = {}): EditorContext =>
  ({ ...initialContext, ...patch })

const resetStores = () => {
  useDiagramStore.setState({ diagram: emptyDiagram() })
  useDiagramStore.temporal.getState().clear()
  useSelectionStore.setState({
    selectedNodeIds: new Set(), selectedEdgeIds: new Set(), rubberband: null,
  })
  useViewportStore.setState({ zoom: 1, pan: { x: 0, y: 0 } })
  useUiStore.setState({
    theme: 'system', language: 'en',
    panels: { properties: true, minimap: false },
    modals: [], toasts: [],
  })
}

describe('actions — placeNode', () => {
  beforeEach(resetStores)
  it('places an entity at the event point when tool is entity', () => {
    const event: EditorEvent = {
      type: 'CANVAS_POINTER_UP', point: { x: 50, y: 75 },
    }
    placeNode(withContext({ tool: 'entity' }), event)
    const d = useDiagramStore.getState().diagram
    expect(d.nodeOrder).toHaveLength(1)
    const node = d.nodesById[d.nodeOrder[0]!]!
    expect(node.kind).toBe('entity')
    expect(node.position).toEqual({ x: 50, y: 75 })
  })
  it('places a relationship when tool is relationship', () => {
    placeNode(withContext({ tool: 'relationship' }), {
      type: 'CANVAS_POINTER_UP', point: { x: 0, y: 0 },
    })
    const d = useDiagramStore.getState().diagram
    expect(d.nodesById[d.nodeOrder[0]!]!.kind).toBe('relationship')
  })
  it('places an attribute when tool is attribute', () => {
    placeNode(withContext({ tool: 'attribute' }), {
      type: 'CANVAS_POINTER_UP', point: { x: 0, y: 0 },
    })
    const d = useDiagramStore.getState().diagram
    expect(d.nodesById[d.nodeOrder[0]!]!.kind).toBe('attribute')
  })
  it('places an isa when tool is isa', () => {
    placeNode(withContext({ tool: 'isa' }), {
      type: 'CANVAS_POINTER_UP', point: { x: 0, y: 0 },
    })
    const d = useDiagramStore.getState().diagram
    expect(d.nodesById[d.nodeOrder[0]!]!.kind).toBe('isa')
  })
  it('no-ops for a non-placement tool', () => {
    placeNode(withContext({ tool: 'select' }), {
      type: 'CANVAS_POINTER_UP', point: { x: 0, y: 0 },
    })
    expect(useDiagramStore.getState().diagram.nodeOrder).toHaveLength(0)
  })
  it('gives placed entities unique incrementing names (Entity 1, Entity 2, ...)', () => {
    placeNode(withContext({ tool: 'entity' }), { type: 'CANVAS_POINTER_UP', point: { x: 10, y: 10 } })
    placeNode(withContext({ tool: 'entity' }), { type: 'CANVAS_POINTER_UP', point: { x: 20, y: 20 } })
    placeNode(withContext({ tool: 'entity' }), { type: 'CANVAS_POINTER_UP', point: { x: 30, y: 30 } })
    const d = useDiagramStore.getState().diagram
    const names = d.nodeOrder.map((id) => (d.nodesById[id] as { name: string }).name)
    expect(names).toEqual(['Entity 1', 'Entity 2', 'Entity 3'])
  })
  it('gives placed relationships unique incrementing names (Relationship 1, Relationship 2)', () => {
    placeNode(withContext({ tool: 'relationship' }), { type: 'CANVAS_POINTER_UP', point: { x: 0, y: 0 } })
    placeNode(withContext({ tool: 'relationship' }), { type: 'CANVAS_POINTER_UP', point: { x: 50, y: 50 } })
    const d = useDiagramStore.getState().diagram
    const names = d.nodeOrder.map((id) => (d.nodesById[id] as { name: string }).name)
    expect(names).toEqual(['Relationship 1', 'Relationship 2'])
  })
  it('gives placed attributes unique incrementing names (attribute 1, attribute 2)', () => {
    placeNode(withContext({ tool: 'attribute' }), { type: 'CANVAS_POINTER_UP', point: { x: 0, y: 0 } })
    placeNode(withContext({ tool: 'attribute' }), { type: 'CANVAS_POINTER_UP', point: { x: 50, y: 50 } })
    const d = useDiagramStore.getState().diagram
    const names = d.nodeOrder.map((id) => (d.nodesById[id] as { name: string }).name)
    expect(names).toEqual(['attribute 1', 'attribute 2'])
  })
  it('counters are kind-scoped — placing entity then relationship does NOT share a counter', () => {
    placeNode(withContext({ tool: 'entity' }), { type: 'CANVAS_POINTER_UP', point: { x: 0, y: 0 } })
    placeNode(withContext({ tool: 'relationship' }), { type: 'CANVAS_POINTER_UP', point: { x: 10, y: 10 } })
    placeNode(withContext({ tool: 'entity' }), { type: 'CANVAS_POINTER_UP', point: { x: 20, y: 20 } })
    const d = useDiagramStore.getState().diagram
    const names = d.nodeOrder.map((id) => (d.nodesById[id] as { name: string }).name)
    expect(names).toEqual(['Entity 1', 'Relationship 1', 'Entity 2'])
  })
})

describe('actions — moveDraggedNode', () => {
  beforeEach(resetStores)
  it('moves the dragged node to the event point', () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'E', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    moveDraggedNode(
      withContext({ draggedNodeId: id, dragOriginPoint: { x: 0, y: 0 } }),
      { type: 'CANVAS_POINTER_MOVE', point: { x: 100, y: 50 } },
    )
    expect(useDiagramStore.getState().diagram.nodesById[id]!.position)
      .toEqual({ x: 100, y: 50 })
  })
  it('no-ops when draggedNodeId is null', () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'E', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    moveDraggedNode(
      withContext({ draggedNodeId: null, dragOriginPoint: null }),
      { type: 'CANVAS_POINTER_MOVE', point: { x: 100, y: 50 } },
    )
    expect(useDiagramStore.getState().diagram.nodesById[id]!.position).toEqual({ x: 0, y: 0 })
  })
})

describe('actions — connectNodes', () => {
  beforeEach(resetStores)
  it('adds an entity-relationship edge for quick-relationship tool', () => {
    const store = useDiagramStore.getState()
    const a = store.addNode({
      kind: 'entity', name: 'A', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const b = store.addNode({
      kind: 'entity', name: 'B', isWeak: false,
      position: { x: 200, y: 0 }, size: { width: 120, height: 60 },
    })
    connectNodes(
      withContext({ tool: 'quickRelationship', quickFirstId: a }),
      { type: 'NODE_POINTER_DOWN', nodeId: b, point: { x: 200, y: 0 }, modifiers: NO_MODIFIERS, button: 'left' },
    )
    // Quick-relationship creates a rel node + two ER edges
    const d = useDiagramStore.getState().diagram
    expect(d.nodeOrder).toHaveLength(3)  // 2 entities + 1 rel
    expect(d.edgeOrder).toHaveLength(2)  // 2 ER edges
  })
  it('adds an isa hierarchy for quick-generalization tool', () => {
    const store = useDiagramStore.getState()
    const parent = store.addNode({
      kind: 'entity', name: 'P', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const child = store.addNode({
      kind: 'entity', name: 'C', isWeak: false,
      position: { x: 0, y: 200 }, size: { width: 120, height: 60 },
    })
    connectNodes(
      withContext({ tool: 'quickGeneralization', quickFirstId: parent }),
      { type: 'NODE_POINTER_DOWN', nodeId: child, point: { x: 0, y: 200 }, modifiers: NO_MODIFIERS, button: 'left' },
    )
    const d = useDiagramStore.getState().diagram
    expect(d.nodeOrder).toHaveLength(3)  // 2 entities + 1 isa
    expect(d.edgeOrder).toHaveLength(2)  // parent edge + child edge
  })
  it('adds an ER edge for connect tool (entity → relationship)', () => {
    const store = useDiagramStore.getState()
    const e = store.addNode({
      kind: 'entity', name: 'E', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const r = store.addNode({
      kind: 'relationship', name: 'R', isIdentifying: false,
      position: { x: 200, y: 0 }, size: { width: 140, height: 70 },
    })
    connectNodes(
      withContext({ tool: 'connect', connectionFromId: e }),
      { type: 'NODE_POINTER_UP', nodeId: r, point: { x: 200, y: 0 } },
    )
    expect(useDiagramStore.getState().diagram.edgeOrder).toHaveLength(1)
  })
})

describe('actions — rubberband', () => {
  beforeEach(resetStores)
  it('beginRubberband starts selection rubberband', () => {
    beginRubberband(initialContext, {
      type: 'CANVAS_POINTER_DOWN', point: { x: 10, y: 10 }, modifiers: NO_MODIFIERS, button: 'left',
    })
    expect(useSelectionStore.getState().rubberband).toEqual({
      origin: { x: 10, y: 10 }, current: { x: 10, y: 10 },
    })
  })
  it('updateRubberbandAction updates current point', () => {
    useSelectionStore.getState().startRubberband({ x: 0, y: 0 })
    updateRubberbandAction(initialContext, {
      type: 'CANVAS_POINTER_MOVE', point: { x: 50, y: 50 },
    })
    expect(useSelectionStore.getState().rubberband?.current).toEqual({ x: 50, y: 50 })
  })
  it('commitRubberbandAction selects intersecting nodes', () => {
    const store = useDiagramStore.getState()
    const inside = store.addNode({
      kind: 'entity', name: 'I', isWeak: false,
      position: { x: 50, y: 50 }, size: { width: 20, height: 20 },
    })
    const outside = store.addNode({
      kind: 'entity', name: 'O', isWeak: false,
      position: { x: 500, y: 500 }, size: { width: 20, height: 20 },
    })
    useSelectionStore.getState().startRubberband({ x: 0, y: 0 })
    useSelectionStore.getState().updateRubberband({ x: 100, y: 100 })
    commitRubberbandAction(initialContext, { type: 'CANVAS_POINTER_UP', point: { x: 100, y: 100 } })
    const selected = useSelectionStore.getState().selectedNodeIds
    expect(selected.has(inside)).toBe(true)
    expect(selected.has(outside)).toBe(false)
    expect(useSelectionStore.getState().rubberband).toBeNull()
  })
})

describe('actions — selectNodeFromEvent', () => {
  beforeEach(resetStores)
  it('replaces selection on plain click', () => {
    const a = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'A', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    useSelectionStore.getState().select({ nodes: [asNodeId('other_____')], edges: [] })
    selectNodeFromEvent(initialContext, {
      type: 'NODE_POINTER_DOWN', nodeId: a, point: { x: 0, y: 0 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    const sel = useSelectionStore.getState().selectedNodeIds
    expect([...sel]).toEqual([a])
  })
  it('toggles selection on shift-click', () => {
    const a = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'A', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const b = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'B', isWeak: false,
      position: { x: 200, y: 0 }, size: { width: 120, height: 60 },
    })
    useSelectionStore.getState().select({ nodes: [a], edges: [] })
    selectNodeFromEvent(initialContext, {
      type: 'NODE_POINTER_DOWN', nodeId: b, point: { x: 200, y: 0 },
      modifiers: { ...NO_MODIFIERS, shift: true }, button: 'left',
    })
    const sel = useSelectionStore.getState().selectedNodeIds
    expect(sel.has(a)).toBe(true)
    expect(sel.has(b)).toBe(true)
  })
})

describe('actions — viewport', () => {
  beforeEach(resetStores)
  it('panViewportAction applies delta to pan', () => {
    useViewportStore.setState({ zoom: 1, pan: { x: 10, y: 20 } })
    panViewportAction(
      withContext({ dragOriginPoint: { x: 0, y: 0 } }),
      { type: 'CANVAS_POINTER_MOVE', point: { x: 30, y: 30 } },
    )
    // pan = initial pan + (point - dragOriginPoint) = (10,20) + (30,30) = (40,50)
    const { pan } = useViewportStore.getState()
    expect(pan).toEqual({ x: 40, y: 50 })
  })
  it('zoomAtPointAction delegates to viewportStore.zoomAt', () => {
    zoomAtPointAction(initialContext, {
      type: 'WHEEL_ZOOM', anchor: { x: 100, y: 50 }, delta: 1,
    })
    const { zoom } = useViewportStore.getState()
    expect(zoom).toBe(2)
  })
})

describe('actions — selection ops', () => {
  beforeEach(resetStores)
  it('nudgeSelection moves all selected by (dx, dy)', () => {
    const a = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'A', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    useSelectionStore.getState().select({ nodes: [a], edges: [] })
    nudgeSelection(initialContext, { type: 'NUDGE', dx: 5, dy: 3 })
    expect(useDiagramStore.getState().diagram.nodesById[a]!.position).toEqual({ x: 5, y: 3 })
  })
  it('undoAction + redoAction call temporal', () => {
    const addedId = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'A', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    undoAction(initialContext, { type: 'UNDO' })
    expect(useDiagramStore.getState().diagram.nodeOrder).toEqual([])
    redoAction(initialContext, { type: 'REDO' })
    expect(useDiagramStore.getState().diagram.nodeOrder).toEqual([addedId])
  })
  it('deleteSelection + duplicateSelection + selectAll + clearSelection run', () => {
    const a = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'A', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    selectAllAction(initialContext, { type: 'SELECT_ALL' })
    expect(useSelectionStore.getState().selectedNodeIds.has(a)).toBe(true)

    duplicateSelectionAction(initialContext, { type: 'DUPLICATE' })
    expect(useDiagramStore.getState().diagram.nodeOrder).toHaveLength(2)

    deleteSelectionAction(initialContext, { type: 'DELETE' })
    expect(useDiagramStore.getState().diagram.nodeOrder).toHaveLength(1)

    clearSelectionAction(initialContext, { type: 'ESCAPE' })
    expect(useSelectionStore.getState().selectedNodeIds.size).toBe(0)
  })
})

describe('actions — stubs + cheatsheet', () => {
  beforeEach(resetStores)
  it('stubCopy/stubCut/stubPaste do not throw and log once', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    stubCopy(initialContext, { type: 'COPY' })
    stubCut(initialContext, { type: 'CUT' })
    stubPaste(initialContext, { type: 'PASTE' })
    expect(spy).toHaveBeenCalledTimes(3)
    spy.mockRestore()
  })
  it('toggleCheatsheetAction pushes and then pops a cheatsheet modal', () => {
    toggleCheatsheetAction(initialContext, { type: 'TOGGLE_CHEATSHEET' })
    expect(useUiStore.getState().modals.find((m) => m.kind === 'cheatsheet')).toBeDefined()
    toggleCheatsheetAction(initialContext, { type: 'TOGGLE_CHEATSHEET' })
    expect(useUiStore.getState().modals.find((m) => m.kind === 'cheatsheet')).toBeUndefined()
  })
})
