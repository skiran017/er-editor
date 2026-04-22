import type {
  Diagram, NodeId, ERNode, ERLink, NodeKind, EdgeKind,
  EntityNode, RelationshipNode, AttributeNode, ISANode,
  EntityRelationshipEdge, AttributeEdge, ISAEdge,
} from './types'

export const incidentEdges = (diagram: Diagram, nodeId: NodeId): readonly ERLink[] =>
  diagram.edgeOrder
    .map((id) => diagram.edgesById[id])
    .filter((e): e is ERLink => !!e && (e.sourceId === nodeId || e.targetId === nodeId))

export const neighbors = (
  diagram: Diagram,
  nodeId: NodeId,
  opts?: { edgeKind?: EdgeKind },
): NodeId[] => {
  const out: NodeId[] = []
  for (const edge of incidentEdges(diagram, nodeId)) {
    if (opts?.edgeKind && edge.kind !== opts.edgeKind) continue
    const other = edge.sourceId === nodeId ? edge.targetId : edge.sourceId
    out.push(other)
  }
  return out
}

export const nodesByKind = <K extends NodeKind>(
  diagram: Diagram,
  kind: K,
): readonly Extract<ERNode, { kind: K }>[] =>
  diagram.nodeOrder
    .map((id) => diagram.nodesById[id])
    .filter((n): n is Extract<ERNode, { kind: K }> => !!n && n.kind === kind)

export const edgesByKind = <K extends EdgeKind>(
  diagram: Diagram,
  kind: K,
): readonly Extract<ERLink, { kind: K }>[] =>
  diagram.edgeOrder
    .map((id) => diagram.edgesById[id])
    .filter((e): e is Extract<ERLink, { kind: K }> => !!e && e.kind === kind)

export const hasPath = (diagram: Diagram, from: NodeId, to: NodeId): boolean => {
  if (from === to) return true
  const visited = new Set<NodeId>([from])
  const queue: NodeId[] = [from]
  while (queue.length > 0) {
    const current = queue.shift()!
    for (const n of neighbors(diagram, current)) {
      if (n === to) return true
      if (!visited.has(n)) {
        visited.add(n)
        queue.push(n)
      }
    }
  }
  return false
}

// Type guards (keep with graph since predicates are filter-helpers)
export const isEntityNode = (n: ERNode): n is EntityNode => n.kind === 'entity'
export const isRelationshipNode = (n: ERNode): n is RelationshipNode => n.kind === 'relationship'
export const isAttributeNode = (n: ERNode): n is AttributeNode => n.kind === 'attribute'
export const isIsaNode = (n: ERNode): n is ISANode => n.kind === 'isa'

export const isEntityRelationshipEdge = (e: ERLink): e is EntityRelationshipEdge =>
  e.kind === 'entity-relationship'
export const isAttributeEdge = (e: ERLink): e is AttributeEdge => e.kind === 'attribute-of'
export const isIsaEdge = (e: ERLink): e is ISAEdge => e.kind === 'isa-link'
