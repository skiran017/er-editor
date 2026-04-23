import type { NodeId, EdgeId, Point } from '@/domain/types'

export type Tool =
  | 'select'
  | 'pan'
  | 'entity'
  | 'relationship'
  | 'attribute'
  | 'isa'
  | 'connect'
  // Legacy-parity quick-relationship variants: user picks the cardinality
  // pair up front from the toolbar, then clicks two entities to wire them
  // through a new relationship node with the chosen cardinality on each edge.
  | 'quickRelationship11'
  | 'quickRelationship1N'
  | 'quickRelationshipNN'
  // ISA quick-wire — partial is default, total draws the generalization
  // with isTotal=true (shown as double line from ISA to parent).
  | 'quickGeneralization'
  | 'quickGeneralizationTotal'

export type PointerButton = 'left' | 'middle' | 'right'

export type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

export interface Modifiers {
  readonly shift: boolean
  readonly ctrl: boolean
  readonly alt: boolean
  readonly meta: boolean
}

export const NO_MODIFIERS: Modifiers = Object.freeze({
  shift: false, ctrl: false, alt: false, meta: false,
})

export type EditorEvent =
  // Tool picker
  | { readonly type: 'PICK_TOOL'; readonly tool: Tool }
  // Canvas pointer lifecycle
  | { readonly type: 'CANVAS_POINTER_DOWN'; readonly point: Point; readonly modifiers: Modifiers; readonly button: PointerButton }
  | { readonly type: 'CANVAS_POINTER_MOVE'; readonly point: Point }
  | { readonly type: 'CANVAS_POINTER_UP'; readonly point: Point }
  // Pane click — dispatched ONLY from React Flow's onPaneClick (i.e. when the
  // user clicks on the blank pane, not on a node or edge). Use this for
  // cancel-on-empty-click semantics; do not conflate with CANVAS_POINTER_DOWN
  // which bubbles from node clicks too (RF v12 does not stop propagation).
  | { readonly type: 'PANE_CLICK'; readonly point: Point }
  // Node/edge pointer events
  | { readonly type: 'NODE_POINTER_DOWN'; readonly nodeId: NodeId; readonly point: Point; readonly modifiers: Modifiers; readonly button: PointerButton }
  | { readonly type: 'NODE_POINTER_UP'; readonly nodeId: NodeId; readonly point: Point }
  | { readonly type: 'EDGE_POINTER_DOWN'; readonly edgeId: EdgeId; readonly point: Point; readonly modifiers: Modifiers; readonly button: PointerButton }
  // Resize + handles
  | { readonly type: 'HANDLE_POINTER_DOWN'; readonly nodeId: NodeId; readonly handleId: string; readonly point: Point }
  | { readonly type: 'RESIZE_HANDLE_POINTER_DOWN'; readonly nodeId: NodeId; readonly handle: ResizeHandle; readonly point: Point }
  // Contextual
  | { readonly type: 'ESCAPE' }
  | { readonly type: 'DELETE' }
  // History
  | { readonly type: 'UNDO' }
  | { readonly type: 'REDO' }
  // Clipboard (Phase 3 wires stubs; full impl in Sub-project 4)
  | { readonly type: 'COPY' }
  | { readonly type: 'CUT' }
  | { readonly type: 'PASTE' }
  | { readonly type: 'DUPLICATE' }
  // Selection ops
  | { readonly type: 'SELECT_ALL' }
  | { readonly type: 'INVERT_SELECTION' }
  | { readonly type: 'NUDGE'; readonly dx: number; readonly dy: number }
  | { readonly type: 'CYCLE_SELECTION'; readonly direction: 'forward' | 'backward' }
  // Viewport
  | { readonly type: 'WHEEL_ZOOM'; readonly anchor: Point; readonly delta: number }
  | { readonly type: 'FIT' }
  | { readonly type: 'ZOOM_IN' }
  | { readonly type: 'ZOOM_OUT' }
  // Inline rename
  | { readonly type: 'RENAME' }
  // Modal confirm/cancel
  | { readonly type: 'CONFIRM' }
  | { readonly type: 'CANCEL' }
  // Cheatsheet
  | { readonly type: 'TOGGLE_CHEATSHEET' }
  // Generalization: start connecting an ISA node to a child entity (right-click on ISA → "Add child entity")
  | { readonly type: 'CONNECT_CHILD_TO_ISA'; readonly isaId: NodeId }

export type EditorEventType = EditorEvent['type']
