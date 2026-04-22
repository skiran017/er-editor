import type { ERNode, ERLink, NodeId, EdgeId } from '@/domain/types'

// Input to addNode — same shape as ERNode minus id (id is generated inside the store).
export type NodeInput =
  | Omit<Extract<ERNode, { kind: 'entity' }>, 'id'>
  | Omit<Extract<ERNode, { kind: 'relationship' }>, 'id'>
  | Omit<Extract<ERNode, { kind: 'attribute' }>, 'id'>
  | Omit<Extract<ERNode, { kind: 'isa' }>, 'id'>

// Input to addEdge — same shape as ERLink minus id.
export type EdgeInput =
  | Omit<Extract<ERLink, { kind: 'entity-relationship' }>, 'id'>
  | Omit<Extract<ERLink, { kind: 'attribute-of' }>, 'id'>
  | Omit<Extract<ERLink, { kind: 'isa-link' }>, 'id'>

// Patch applied as a single undo step for multi-element mutations
// (paste, delete-selection, import). Already-formed ids expected
// since callers supply concrete nodes/edges.
export interface DiagramPatch {
  readonly addNodes?: readonly ERNode[]
  readonly updateNodes?: readonly { readonly id: NodeId; readonly patch: Partial<ERNode> }[]
  readonly removeNodes?: readonly NodeId[]
  readonly addEdges?: readonly ERLink[]
  readonly updateEdges?: readonly { readonly id: EdgeId; readonly patch: Partial<ERLink> }[]
  readonly removeEdges?: readonly EdgeId[]
}
