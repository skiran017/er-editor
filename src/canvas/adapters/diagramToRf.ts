import { Position, type Edge as RfEdge, type Node as RfNode } from '@xyflow/react'
import type { Diagram, EdgeId, ERLink, ERNode, NodeId } from '@/domain/types'

export type RfNodeData = { readonly nodeId: NodeId } & Record<string, unknown>
export type RfEdgeData = { readonly edgeId: EdgeId } & Record<string, unknown>

export type CanvasNode = RfNode<RfNodeData>
export type CanvasEdge = RfEdge<RfEdgeData>

export const diagramToRf = (
  diagram: Diagram,
): { nodes: CanvasNode[]; edges: CanvasEdge[] } => ({
  nodes: diagram.nodeOrder.map((id) => domainNodeToRf(diagram.nodesById[id])),
  edges: diagram.edgeOrder.map((id) => domainEdgeToRf(diagram.edgesById[id])),
})

const domainNodeToRf = (n: ERNode): CanvasNode => {
  const w = n.size.width
  const h = n.size.height
  return {
    id: n.id,
    type: n.kind,
    position: { x: n.position.x, y: n.position.y },
    data: { nodeId: n.id },
    // RF v12: `width`/`height` on a Node are read-only (computed by RF from
    // the measured DOM). Pass dimensions via `initialWidth`/`initialHeight`
    // (user-writable hints RF uses before the first measurement).
    initialWidth: w,
    initialHeight: h,
    // RF drag uses `node.measured.width/height` and emits #015 when undefined.
    // ResizeObserver *should* populate this post-mount, but React 19
    // StrictMode's double-mount can disconnect RF's observer before it fires.
    // Seeding `measured` directly avoids the warning and makes drag math work
    // on the very first gesture; RF overwrites this with real values the
    // instant the observer does fire.
    measured: { width: w, height: h },
    // Explicit handle definitions. RF's `getEdgePosition` falls back to these
    // when `internals.handleBounds` is undefined — which it is on first render
    // and can remain so if the observer was disconnected. Without this, the
    // `<div class="react-flow__edges">` container stays empty because
    // EdgeWrapper returns null for null coords. All four node kinds share the
    // same left/right geometry.
    handles: [
      { id: 'src', type: 'source', position: Position.Right, x: w, y: h / 2 },
      { id: 'tgt', type: 'target', position: Position.Left, x: 0, y: h / 2 },
    ],
  }
}

const domainEdgeToRf = (e: ERLink): CanvasEdge => ({
  id: e.id,
  source: e.sourceId,
  target: e.targetId,
  type: e.kind,
  data: { edgeId: e.id },
  // Edges are NOT user-selectable. Cardinality / participation / role live on
  // the relationship node's property panel (see RelationshipLegsEditor), so
  // direct line selection is redundant — and historically caused a class of
  // bugs (delete an entity-relationship edge → relationship left orphaned
  // with one branch, hard to reconnect cleanly). Deleting the relationship
  // node still cascades and removes its incident edges.
  selectable: false,
  focusable: false,
})
