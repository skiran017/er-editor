import type { Edge as RfEdge, Node as RfNode } from '@xyflow/react'
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

const domainNodeToRf = (n: ERNode): CanvasNode => ({
  id: n.id,
  type: n.kind,
  position: { x: n.position.x, y: n.position.y },
  data: { nodeId: n.id },
  width: n.size.width,
  height: n.size.height,
})

const domainEdgeToRf = (e: ERLink): CanvasEdge => ({
  id: e.id,
  source: e.sourceId,
  target: e.targetId,
  type: e.kind,
  data: { edgeId: e.id },
})
