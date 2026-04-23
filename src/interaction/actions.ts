import { useDiagramStore } from '@/state/diagramStore'
import { useSelectionStore } from '@/state/selectionStore'
import { useViewportStore } from '@/state/viewportStore'
import { useUiStore } from '@/state/uiStore'
import {
  deleteSelection as deleteSelectionCmd,
  duplicateSelection as duplicateSelectionCmd,
  selectAll as selectAllCmd,
  clearSelection as clearSelectionCmd,
} from '@/state/commands'
import { bboxFromNodeLike, bboxIntersects } from '@/domain/geometry'
import { isEntityNode } from '@/domain/graph'
import type { BBox, ERNode, EntityRelationshipEdge, ISAEdge, NodeId } from '@/domain/types'
import type { EditorContext } from './context'
import type { EditorEvent } from './events'

// ——— helpers ———

const DEFAULT_SIZES = {
  entity:       { width: 120, height: 60 },
  relationship: { width: 140, height: 70 },
  attribute:    { width: 90,  height: 50 },
  isa:          { width: 100, height: 60 },
} as const

const bboxOfRubberband = (origin: { x: number; y: number }, current: { x: number; y: number }): BBox => ({
  x: Math.min(origin.x, current.x),
  y: Math.min(origin.y, current.y),
  width: Math.abs(current.x - origin.x),
  height: Math.abs(current.y - origin.y),
})

// ——— placement + drag ———

export const placeNode = (context: EditorContext, event: EditorEvent): void => {
  if (event.type !== 'CANVAS_POINTER_UP') return
  const tool = context.tool
  if (tool !== 'entity' && tool !== 'relationship' && tool !== 'attribute' && tool !== 'isa') return
  const size = DEFAULT_SIZES[tool]
  if (tool === 'entity') {
    useDiagramStore.getState().addNode({
      kind: 'entity', name: 'Entity', isWeak: false,
      position: event.point, size,
    })
  } else if (tool === 'relationship') {
    useDiagramStore.getState().addNode({
      kind: 'relationship', name: 'Relationship', isIdentifying: false,
      position: event.point, size,
    })
  } else if (tool === 'attribute') {
    useDiagramStore.getState().addNode({
      kind: 'attribute', name: 'attribute',
      isKey: false, isDiscriminant: false, isMultivalued: false, isDerived: false, isComposite: false,
      position: event.point, size,
    })
  } else {
    useDiagramStore.getState().addNode({
      kind: 'isa', isTotal: false,
      position: event.point, size,
    })
  }
}

export const moveDraggedNode = (context: EditorContext, event: EditorEvent): void => {
  if (event.type !== 'CANVAS_POINTER_MOVE') return
  if (!context.draggedNodeId) return
  useDiagramStore.getState().moveNode(context.draggedNodeId, event.point)
}

// ——— rubberband ———

export const beginRubberband = (_context: EditorContext, event: EditorEvent): void => {
  if (event.type !== 'CANVAS_POINTER_DOWN') return
  useSelectionStore.getState().startRubberband(event.point)
}

export const updateRubberbandAction = (_context: EditorContext, event: EditorEvent): void => {
  if (event.type !== 'CANVAS_POINTER_MOVE') return
  useSelectionStore.getState().updateRubberband(event.point)
}

export const commitRubberbandAction = (_context: EditorContext, _event: EditorEvent): void => {
  const rb = useSelectionStore.getState().rubberband
  if (!rb) return
  const rbBox = bboxOfRubberband(rb.origin, rb.current)
  const diagram = useDiagramStore.getState().diagram
  const nodes = diagram.nodeOrder
    .map((id) => diagram.nodesById[id])
    .filter((n): n is NonNullable<typeof n> => !!n)
    .filter((n) => bboxIntersects(bboxFromNodeLike(n), rbBox))
    .map((n) => n.id)
  useSelectionStore.getState().commitRubberband({ nodes, edges: [] })
}

// ——— selection ———

export const selectNodeFromEvent = (_context: EditorContext, event: EditorEvent): void => {
  if (event.type !== 'NODE_POINTER_DOWN') return
  if (event.modifiers.shift) {
    useSelectionStore.getState().toggle({ nodes: [event.nodeId], edges: [] })
  } else {
    useSelectionStore.getState().select({ nodes: [event.nodeId], edges: [] })
  }
}

// ——— viewport ———

export const panViewportAction = (context: EditorContext, event: EditorEvent): void => {
  if (event.type !== 'CANVAS_POINTER_MOVE') return
  if (!context.dragOriginPoint) return
  const { pan } = useViewportStore.getState()
  useViewportStore.getState().setViewport({
    zoom: useViewportStore.getState().zoom,
    pan: {
      x: pan.x + (event.point.x - context.dragOriginPoint.x),
      y: pan.y + (event.point.y - context.dragOriginPoint.y),
    },
  })
}

export const zoomAtPointAction = (_context: EditorContext, event: EditorEvent): void => {
  if (event.type !== 'WHEEL_ZOOM') return
  useViewportStore.getState().zoomAt(event.anchor, event.delta)
}

const KEYBOARD_ZOOM_STEP = 0.5

export const zoomInAction = (_context: EditorContext, _event: EditorEvent): void => {
  const { zoom } = useViewportStore.getState()
  useViewportStore.getState().setViewport({
    zoom: zoom + KEYBOARD_ZOOM_STEP,
    pan: useViewportStore.getState().pan,
  })
}

export const zoomOutAction = (_context: EditorContext, _event: EditorEvent): void => {
  const { zoom } = useViewportStore.getState()
  useViewportStore.getState().setViewport({
    zoom: zoom - KEYBOARD_ZOOM_STEP,
    pan: useViewportStore.getState().pan,
  })
}

// FIT needs the live viewport size, which only the canvas has. Phase 4 wires
// this by computing the bbox of nodes + the canvas's DOMRect and calling
// viewportStore.fit directly. Keep as a no-op dispatch here so the
// keybinding doesn't silently drop.
export const fitAction = (_context: EditorContext, _event: EditorEvent): void => {
  // Phase 4 will compute bbox + viewport size and call viewportStore.fit.
}

// ——— selection ops ———

export const nudgeSelection = (_context: EditorContext, event: EditorEvent): void => {
  if (event.type !== 'NUDGE') return
  const diagram = useDiagramStore.getState().diagram
  for (const id of useSelectionStore.getState().selectedNodeIds) {
    const n = diagram.nodesById[id]
    if (!n) continue
    useDiagramStore.getState().moveNode(id, { x: n.position.x + event.dx, y: n.position.y + event.dy })
  }
}

// ——— history ———

export const undoAction = (_context: EditorContext, _event: EditorEvent): void => {
  useDiagramStore.temporal.getState().undo()
}

export const redoAction = (_context: EditorContext, _event: EditorEvent): void => {
  useDiagramStore.temporal.getState().redo()
}

// ——— clipboard stubs (Sub-project 4 delivers real clipboard) ———

const logStub = (label: string): void => {
  console.info(`[actions] ${label} — stub; full impl in Sub-project 4`)
}

export const stubCopy = (_c: EditorContext, _e: EditorEvent) => logStub('copy')
export const stubCut = (_c: EditorContext, _e: EditorEvent) => logStub('cut')
export const stubPaste = (_c: EditorContext, _e: EditorEvent) => logStub('paste')

// ——— commands passthroughs ———

export const deleteSelectionAction = (_c: EditorContext, _e: EditorEvent) => deleteSelectionCmd()
export const duplicateSelectionAction = (_c: EditorContext, _e: EditorEvent) => duplicateSelectionCmd()
export const selectAllAction = (_c: EditorContext, _e: EditorEvent) => selectAllCmd()
export const clearSelectionAction = (_c: EditorContext, _e: EditorEvent) => clearSelectionCmd()

// ——— connect — per-tool helpers ———

const midpoint = (a: { position: { x: number; y: number } }, b: { position: { x: number; y: number } }) => ({
  x: (a.position.x + b.position.x) / 2,
  y: (a.position.y + b.position.y) / 2,
})

const connectViaQuickRelationship = (source: ERNode, target: ERNode, sourceId: NodeId, targetId: NodeId): void => {
  if (!isEntityNode(source) || !isEntityNode(target)) return
  const store = useDiagramStore.getState()
  const relId = store.addNode({
    kind: 'relationship', name: 'Relationship', isIdentifying: false,
    position: midpoint(source, target),
    size: { width: 140, height: 70 },
  })
  const e1: Omit<EntityRelationshipEdge, 'id'> = {
    kind: 'entity-relationship', sourceId, targetId: relId,
    cardinality: '1', participation: 'partial', waypoints: [],
  }
  const e2: Omit<EntityRelationshipEdge, 'id'> = {
    kind: 'entity-relationship', sourceId: targetId, targetId: relId,
    cardinality: 'N', participation: 'partial', waypoints: [],
  }
  store.addEdge(e1)
  store.addEdge(e2)
}

const connectViaQuickGeneralization = (source: ERNode, target: ERNode, sourceId: NodeId, targetId: NodeId): void => {
  if (!isEntityNode(source) || !isEntityNode(target)) return
  const store = useDiagramStore.getState()
  const isaId = store.addNode({
    kind: 'isa', isTotal: false,
    position: midpoint(source, target),
    size: { width: 100, height: 60 },
  })
  const parentEdge: Omit<ISAEdge, 'id'> = {
    kind: 'isa-link', sourceId, targetId: isaId, role: 'parent', waypoints: [],
  }
  const childEdge: Omit<ISAEdge, 'id'> = {
    kind: 'isa-link', sourceId: isaId, targetId, role: 'child', waypoints: [],
  }
  store.addEdge(parentEdge)
  store.addEdge(childEdge)
}

const connectViaConnectTool = (source: ERNode, target: ERNode, sourceId: NodeId, targetId: NodeId): void => {
  const store = useDiagramStore.getState()
  if (source.kind === 'entity' && target.kind === 'relationship') {
    store.addEdge({
      kind: 'entity-relationship', sourceId, targetId,
      cardinality: '1', participation: 'partial', waypoints: [],
    })
  } else if (source.kind === 'relationship' && target.kind === 'entity') {
    store.addEdge({
      kind: 'entity-relationship', sourceId: targetId, targetId: sourceId,
      cardinality: '1', participation: 'partial', waypoints: [],
    })
  } else if (source.kind === 'attribute' && (target.kind === 'entity' || target.kind === 'relationship' || (target.kind === 'attribute' && target.isComposite))) {
    store.addEdge({
      kind: 'attribute-of', sourceId, targetId, waypoints: [],
    })
  }
}

export const connectNodes = (context: EditorContext, event: EditorEvent): void => {
  if (event.type !== 'NODE_POINTER_DOWN' && event.type !== 'NODE_POINTER_UP') return
  const targetId = event.nodeId
  const sourceId = context.connectionFromId ?? context.quickFirstId
  if (!sourceId) return

  const diagram = useDiagramStore.getState().diagram
  const source = diagram.nodesById[sourceId]
  const target = diagram.nodesById[targetId]
  if (!source || !target) return

  if (context.tool === 'quickRelationship') {
    connectViaQuickRelationship(source, target, sourceId, targetId)
  } else if (context.tool === 'quickGeneralization') {
    connectViaQuickGeneralization(source, target, sourceId, targetId)
  } else if (context.tool === 'connect') {
    connectViaConnectTool(source, target, sourceId, targetId)
  }
}

// ——— connect-child-to-ISA (right-click on ISA flow) ———

export const connectChildToIsaAction = (context: EditorContext, event: EditorEvent): void => {
  if (!context.connectionFromId) return
  if (event.type !== 'NODE_POINTER_DOWN') return
  const diagram = useDiagramStore.getState().diagram
  const child = diagram.nodesById[event.nodeId]
  if (!child || child.kind !== 'entity') return
  const parentIsa = diagram.nodesById[context.connectionFromId]
  if (!parentIsa || parentIsa.kind !== 'isa') return
  const edge: Omit<ISAEdge, 'id'> = {
    kind: 'isa-link',
    sourceId: context.connectionFromId,
    targetId: event.nodeId,
    role: 'child',
    waypoints: [],
  }
  useDiagramStore.getState().addEdge(edge)
}

// ——— cheatsheet ———

const CHEATSHEET_MODAL_ID = 'cheatsheet'

export const toggleCheatsheetAction = (_c: EditorContext, _e: EditorEvent): void => {
  const ui = useUiStore.getState()
  const open = ui.modals.some((m) => m.kind === 'cheatsheet')
  if (open) {
    // Pop the topmost cheatsheet (simple impl — cheatsheet is typically topmost when invoked).
    const idx = ui.modals.findIndex((m) => m.kind === 'cheatsheet')
    if (idx === ui.modals.length - 1) {
      ui.popModal()
    } else {
      // Non-topmost (unexpected but guarded) — rebuild modals without the cheatsheet.
      useUiStore.setState({
        modals: ui.modals.filter((m) => m.kind !== 'cheatsheet'),
      })
    }
  } else {
    ui.pushModal({ id: CHEATSHEET_MODAL_ID, kind: 'cheatsheet', props: {} })
  }
}
