import { nanoid } from 'nanoid'
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
import { bboxContains, bboxFromNodeLike, bboxIntersects, findNonOverlappingOrigin } from '@/domain/geometry'
import { isEntityNode } from '@/domain/graph'
import { newNodeId, newEdgeId } from '@/domain/id'
import type { AttributeEdge, BBox, Diagram, ERNode, EntityRelationshipEdge, ISAEdge, NodeId } from '@/domain/types'
import type { EditorContext } from './context'
import type { EditorEvent } from './events'

// ——— helpers ———

const isReadonly = (): boolean => useUiStore.getState().readonly

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

// Kind-scoped counter used to give placed nodes distinct default names
// (e.g. 'Entity 1', 'Entity 2'). Counts live nodes of the given kind in the
// current diagram; if the user deletes a node the next placement reuses its
// number, but the diagram invariant (unique ids, not unique names) means
// duplicate-name collisions are recoverable via inline rename.
const countOfKind = (diagram: Diagram, kind: 'entity' | 'relationship' | 'attribute'): number => {
  let n = 0
  for (const id of diagram.nodeOrder) {
    const node = diagram.nodesById[id]
    if (node && node.kind === kind) n += 1
  }
  return n
}

// ——— placement + drag ———

export const placeNode = (context: EditorContext, event: EditorEvent): void => {
  if (isReadonly()) return
  if (event.type !== 'CANVAS_POINTER_UP') return
  const tool = context.tool
  if (tool !== 'entity' && tool !== 'relationship' && tool !== 'attribute' && tool !== 'isa') return
  const size = DEFAULT_SIZES[tool]
  const diagram = useDiagramStore.getState().diagram
  // Centre the bbox on the cursor (click = middle of node, not top-left)
  // and then nudge off existing nodes so the newcomer doesn't overlap a
  // sibling. bbox-centred origin is also what makes the "fan" of attributes
  // around a parent feel right — the user aims at where they want the
  // centre of the new shape.
  const desiredOrigin = {
    x: event.point.x - size.width / 2,
    y: event.point.y - size.height / 2,
  }
  const obstacles: BBox[] = diagram.nodeOrder.map((id) => bboxFromNodeLike(diagram.nodesById[id]))
  const position = findNonOverlappingOrigin(desiredOrigin, size, obstacles)
  if (tool === 'entity') {
    useDiagramStore.getState().addNode({
      kind: 'entity', name: `Entity ${countOfKind(diagram, 'entity') + 1}`, isWeak: false,
      position, size,
    })
  } else if (tool === 'relationship') {
    useDiagramStore.getState().addNode({
      kind: 'relationship', name: `Relationship ${countOfKind(diagram, 'relationship') + 1}`, isIdentifying: false,
      position, size,
    })
  } else if (tool === 'attribute') {
    useDiagramStore.getState().addNode({
      kind: 'attribute', name: `attribute ${countOfKind(diagram, 'attribute') + 1}`,
      isKey: false, isDiscriminant: false, isMultivalued: false, isDerived: false, isComposite: false,
      position, size,
    })
  } else {
    useDiagramStore.getState().addNode({
      kind: 'isa', isTotal: false,
      position, size,
    })
  }
}

export const moveDraggedNode = (context: EditorContext, event: EditorEvent): void => {
  if (isReadonly()) return
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

export const selectEdgeFromEvent = (_context: EditorContext, event: EditorEvent): void => {
  if (event.type !== 'EDGE_POINTER_DOWN') return
  if (event.modifiers.shift) {
    useSelectionStore.getState().toggle({ nodes: [], edges: [event.edgeId] })
  } else {
    useSelectionStore.getState().select({ nodes: [], edges: [event.edgeId] })
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
  if (isReadonly()) return
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
  if (isReadonly()) return
  useDiagramStore.temporal.getState().undo()
}

export const redoAction = (_context: EditorContext, _event: EditorEvent): void => {
  if (isReadonly()) return
  useDiagramStore.temporal.getState().redo()
}

// ——— clipboard stubs (Sub-project 4 delivers real clipboard) ———

const logStub = (label: string): void => {
  console.info(`[actions] ${label} — stub; full impl in Sub-project 4`)
}

export const stubCopy = (_c: EditorContext, _e: EditorEvent) => logStub('copy')
export const stubCut = (_c: EditorContext, _e: EditorEvent): void => {
  if (isReadonly()) return
  logStub('cut')
}
export const stubPaste = (_c: EditorContext, _e: EditorEvent): void => {
  if (isReadonly()) return
  logStub('paste')
}

// ——— commands passthroughs ———

export const deleteSelectionAction = (_c: EditorContext, _e: EditorEvent): void => {
  if (isReadonly()) return
  deleteSelectionCmd()
}
export const duplicateSelectionAction = (_c: EditorContext, _e: EditorEvent): void => {
  if (isReadonly()) return
  duplicateSelectionCmd()
}
export const selectAllAction = (_c: EditorContext, _e: EditorEvent) => selectAllCmd()
export const clearSelectionAction = (_c: EditorContext, _e: EditorEvent) => clearSelectionCmd()

// ——— connect — per-tool helpers ———

const midpoint = (a: { position: { x: number; y: number } }, b: { position: { x: number; y: number } }) => ({
  x: (a.position.x + b.position.x) / 2,
  y: (a.position.y + b.position.y) / 2,
})

type QuickRelMode = 'quickRelationship11' | 'quickRelationship1N' | 'quickRelationshipNN'

const CARDINALITY_PAIR: Record<QuickRelMode, readonly ['1' | 'N' | 'M', '1' | 'N' | 'M']> = {
  quickRelationship11: ['1', '1'],
  quickRelationship1N: ['1', 'N'],
  quickRelationshipNN: ['N', 'N'],
}

const connectViaQuickRelationship = (
  source: ERNode, target: ERNode, sourceId: NodeId, targetId: NodeId,
  mode: QuickRelMode,
): void => {
  if (!isEntityNode(source) || !isEntityNode(target)) return
  const [cardA, cardB] = CARDINALITY_PAIR[mode]
  const store = useDiagramStore.getState()
  const relId = store.addNode({
    kind: 'relationship',
    name: `Relationship ${countOfKind(store.diagram, 'relationship') + 1}`,
    isIdentifying: false,
    position: midpoint(source, target),
    size: { width: 140, height: 70 },
  })
  const e1: Omit<EntityRelationshipEdge, 'id'> = {
    kind: 'entity-relationship', sourceId, targetId: relId,
    cardinality: cardA, participation: 'partial', waypoints: [],
  }
  const e2: Omit<EntityRelationshipEdge, 'id'> = {
    kind: 'entity-relationship', sourceId: targetId, targetId: relId,
    cardinality: cardB, participation: 'partial', waypoints: [],
  }
  store.addEdge(e1)
  store.addEdge(e2)
}

const connectViaQuickGeneralization = (
  source: ERNode, target: ERNode, sourceId: NodeId, targetId: NodeId,
  isTotal: boolean,
): void => {
  if (!isEntityNode(source) || !isEntityNode(target)) return
  const store = useDiagramStore.getState()
  const isaId = store.addNode({
    kind: 'isa', isTotal,
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

// An attribute's parent (per domain INV-2/3) is an entity, a relationship,
// or a COMPOSITE attribute. This helper gates the attribute-of creation path.
const isAttributeParentKind = (n: ERNode): boolean =>
  n.kind === 'entity' || n.kind === 'relationship' ||
  (n.kind === 'attribute' && n.isComposite)

// Each factory returns the new edge spec when the (source, target) pair
// matches its shape, or null. connectViaConnectTool walks them in order and
// creates the first match. Keeping the branches as separate pure functions
// keeps the orchestrator under the lint complexity cap.
const buildEntityRelationshipEdge = (
  source: ERNode, target: ERNode, sourceId: NodeId, targetId: NodeId,
): Omit<EntityRelationshipEdge, 'id'> | null => {
  if (source.kind === 'entity' && target.kind === 'relationship') {
    return { kind: 'entity-relationship', sourceId, targetId, cardinality: '1', participation: 'partial', waypoints: [] }
  }
  if (source.kind === 'relationship' && target.kind === 'entity') {
    return { kind: 'entity-relationship', sourceId: targetId, targetId: sourceId, cardinality: '1', participation: 'partial', waypoints: [] }
  }
  return null
}

const buildAttributeOfEdge = (
  source: ERNode, target: ERNode, sourceId: NodeId, targetId: NodeId,
): Omit<AttributeEdge, 'id'> | null => {
  // Attribute is always the edge source (INV-2/3). Flip direction if the
  // user clicked the parent first.
  if (source.kind === 'attribute' && isAttributeParentKind(target)) {
    return { kind: 'attribute-of', sourceId, targetId, waypoints: [] }
  }
  if (target.kind === 'attribute' && isAttributeParentKind(source)) {
    return { kind: 'attribute-of', sourceId: targetId, targetId: sourceId, waypoints: [] }
  }
  return null
}

const buildIsaChildEdge = (
  source: ERNode, target: ERNode, sourceId: NodeId, targetId: NodeId,
): Omit<ISAEdge, 'id'> | null => {
  // Connect tool entity↔ISA adds a CHILD link to an existing ISA. The parent
  // is locked at ISA creation time via the quickGeneralization flow, so the
  // connect tool can only extend the child list. Normalise so ISA is source.
  if (source.kind === 'isa' && target.kind === 'entity') {
    return { kind: 'isa-link', sourceId, targetId, role: 'child', waypoints: [] }
  }
  if (source.kind === 'entity' && target.kind === 'isa') {
    return { kind: 'isa-link', sourceId: targetId, targetId: sourceId, role: 'child', waypoints: [] }
  }
  return null
}

const connectViaConnectTool = (source: ERNode, target: ERNode, sourceId: NodeId, targetId: NodeId): void => {
  const store = useDiagramStore.getState()
  const edge =
    buildEntityRelationshipEdge(source, target, sourceId, targetId)
    ?? buildAttributeOfEdge(source, target, sourceId, targetId)
    ?? buildIsaChildEdge(source, target, sourceId, targetId)
  if (edge) store.addEdge(edge)
}

export const connectNodes = (context: EditorContext, event: EditorEvent): void => {
  if (isReadonly()) return
  if (event.type !== 'NODE_POINTER_DOWN' && event.type !== 'NODE_POINTER_UP') return
  const targetId = event.nodeId
  const sourceId = context.connectionFromId ?? context.quickFirstId
  if (!sourceId) return

  const diagram = useDiagramStore.getState().diagram
  const source = diagram.nodesById[sourceId]
  const target = diagram.nodesById[targetId]
  if (!source || !target) return

  if (
    context.tool === 'quickRelationship11'
    || context.tool === 'quickRelationship1N'
    || context.tool === 'quickRelationshipNN'
  ) {
    connectViaQuickRelationship(source, target, sourceId, targetId, context.tool)
  } else if (
    context.tool === 'quickGeneralization'
    || context.tool === 'quickGeneralizationTotal'
  ) {
    const isTotal = context.tool === 'quickGeneralizationTotal'
    connectViaQuickGeneralization(source, target, sourceId, targetId, isTotal)
  } else if (context.tool === 'connect') {
    connectViaConnectTool(source, target, sourceId, targetId)
  }
}

// ——— connect-child-to-ISA (right-click on ISA flow) ———

export const connectChildToIsaAction = (context: EditorContext, event: EditorEvent): void => {
  if (isReadonly()) return
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

// ——— inline rename ———

export const beginRenameSelected = (): void => {
  if (isReadonly()) return
  const selected = useSelectionStore.getState().selectedNodeIds
  if (selected.size !== 1) return
  const [id] = [...selected]
  const node = useDiagramStore.getState().diagram.nodesById[id]
  if (!node) return
  if (node.kind === 'isa') return // ISA has no name
  useUiStore.getState().startInlineRename({ nodeId: id, initialValue: node.name })
}

// ——— attribute-tool placement (Chen semantics) ———

// Attributes must hang off an entity, relationship, or another attribute
// (composite). When the Attribute tool is active and the user clicks one of
// those kinds, create the attribute adjacent to the parent and wire it.
export const placeAttributeOnParent = (event: EditorEvent): void => {
  if (isReadonly()) return
  if (event.type !== 'NODE_POINTER_DOWN') return
  const { diagram } = useDiagramStore.getState()
  const parent = diagram.nodesById[event.nodeId]
  if (!parent) return
  if (parent.kind !== 'entity' && parent.kind !== 'relationship' && parent.kind !== 'attribute') return

  // Per-parent counter: count attributes whose `attribute-of` edge points
  // at THIS parent. Using the global kind count was wrong because e.g. the
  // first attribute of a new relationship would be named "attribute 2" if
  // an attribute already existed on some other parent (Bug 3).
  let existingChildren = 0
  for (const eid of diagram.edgeOrder) {
    const edge = diagram.edgesById[eid]
    if (!edge) continue
    if (edge.kind === 'attribute-of' && edge.targetId === parent.id) existingChildren += 1
  }
  const name = `attribute ${existingChildren + 1}`
  const size = { width: 90, height: 50 }
  // Place the attribute outside the parent in the direction of the click —
  // so the user can "fan out" multiple attributes by clicking different
  // sides of the parent. A small deterministic jitter based on the child
  // index prevents duplicates from stacking exactly on top of each other
  // when the user clicks the same spot repeatedly.
  const cx = parent.position.x + parent.size.width / 2
  const cy = parent.position.y + parent.size.height / 2
  let dx = event.point.x - cx
  let dy = event.point.y - cy
  let len = Math.hypot(dx, dy)
  if (len < 1) {
    // Click almost exactly at the centre — default direction is to the right.
    dx = 1
    dy = 0
    len = 1
  }
  const ux = dx / len
  const uy = dy / len
  // Distance from the parent's centre: push past the parent's furthest
  // corner plus a gap, plus a 14-px step per existing child so repeated
  // clicks in the same direction walk outward instead of stacking.
  const diag = Math.hypot(parent.size.width, parent.size.height) / 2
  const step = 14
  const gap = 40
  const dist = diag + gap + existingChildren * step
  const desiredOrigin = {
    x: cx + ux * dist - size.width / 2,
    y: cy + uy * dist - size.height / 2,
  }
  // Same overlap guard as placeNode — if the fanned-out spot happens to
  // land on another unrelated node, spiral outward until clear.
  const obstacles: BBox[] = diagram.nodeOrder.map((id) => bboxFromNodeLike(diagram.nodesById[id]))
  const position = findNonOverlappingOrigin(desiredOrigin, size, obstacles)

  // Apply node + edge in a single applyPatch so the invariant subscriber
  // (src/app/bootstrap.ts) doesn't see a transient state where the new
  // attribute has no outbound attribute-of edge (INV-2).
  const attrId = newNodeId()
  const edgeId = newEdgeId()
  useDiagramStore.getState().applyPatch({
    addNodes: [{
      id: attrId,
      kind: 'attribute',
      name,
      isKey: false,
      isDiscriminant: false,
      isMultivalued: false,
      isDerived: false,
      isComposite: false,
      position,
      size,
    }],
    addEdges: [{
      id: edgeId,
      kind: 'attribute-of',
      // attribute-of edges flow FROM the attribute TO its parent
      // (domain invariant — see src/domain/invariants.ts).
      sourceId: attrId,
      targetId: parent.id,
      waypoints: [],
    }],
  })
}

export const rejectOrphanAttributeToast = (event: EditorEvent): void => {
  if (event.type !== 'CANVAS_POINTER_UP') return
  // Native pointerup on a valid-parent node bubbles to useMouse and fires
  // CANVAS_POINTER_UP *before* RF's onNodeClick dispatches NODE_POINTER_DOWN
  // (which would take the `canHostAttribute` path). Without this guard we'd
  // toast "needs a parent" on every successful placement. Skip the toast
  // whenever the click point falls inside an existing valid-parent node —
  // the NODE_POINTER_DOWN that follows will handle placement.
  const { diagram } = useDiagramStore.getState()
  for (const id of diagram.nodeOrder) {
    const n = diagram.nodesById[id]
    if (!n) continue
    if (n.kind !== 'entity' && n.kind !== 'relationship' && n.kind !== 'attribute') continue
    if (bboxContains(bboxFromNodeLike(n), event.point)) return
  }
  useUiStore.getState().pushToast({
    id: `orphan-attr-${nanoid()}`,
    kind: 'info',
    messageKey: 'common:attributeNeedsParent',
  })
}

// ——— flow toasts ———
//
// Multi-step tools (connect, quickRelationship, quickGeneralization,
// connectToGeneralization) use entry-action toasts to guide the user
// through each click. Toasts have stable IDs so re-entering a state
// replaces the previous hint in-place instead of stacking.

const FLOW_TOAST_ID = 'flow-hint'

const showFlowToast = (messageKey: string): void => {
  const ui = useUiStore.getState()
  ui.dismissToast(FLOW_TOAST_ID)
  ui.pushToast({ id: FLOW_TOAST_ID, kind: 'info', messageKey })
}

const dismissFlowToast = (): void => {
  useUiStore.getState().dismissToast(FLOW_TOAST_ID)
}

export const toastConnectPickSource = (): void => showFlowToast('common:flow.connect.pickSource')
export const toastConnectPickTarget = (): void => showFlowToast('common:flow.connect.pickTarget')
export const toastQuickRelPickFirst = (): void => showFlowToast('common:flow.quickRel.pickFirst')
export const toastQuickRelPickSecond = (): void => showFlowToast('common:flow.quickRel.pickSecond')
export const toastQuickGenPickParent = (): void => showFlowToast('common:flow.quickGen.pickParent')
export const toastQuickGenPickChild = (): void => showFlowToast('common:flow.quickGen.pickChild')
export const toastAddChildToIsa = (): void => showFlowToast('common:flow.addChildToIsa')
export const clearFlowToast = (): void => dismissFlowToast()

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
