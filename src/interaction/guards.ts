import type { Diagram, NodeId } from '@/domain/types'
import {
  isAttributeNode, isEntityNode, isIsaEdge, isIsaNode, isRelationshipNode,
  incidentEdges,
} from '@/domain/graph'

export const isEntity = (diagram: Diagram, nodeId: NodeId): boolean => {
  const n = diagram.nodesById[nodeId]
  return !!n && isEntityNode(n)
}

export const isRelationship = (diagram: Diagram, nodeId: NodeId): boolean => {
  const n = diagram.nodesById[nodeId]
  return !!n && isRelationshipNode(n)
}

export const isAttribute = (diagram: Diagram, nodeId: NodeId): boolean => {
  const n = diagram.nodesById[nodeId]
  return !!n && isAttributeNode(n)
}

export const isISA = (diagram: Diagram, nodeId: NodeId): boolean => {
  const n = diagram.nodesById[nodeId]
  return !!n && isIsaNode(n)
}

export const canHaveAttribute = (diagram: Diagram, nodeId: NodeId): boolean =>
  isEntity(diagram, nodeId) || isRelationship(diagram, nodeId)

export const isDifferentNode = (a: NodeId | null, b: NodeId | null): boolean => {
  if (a === null || b === null) return false
  return a !== b
}

export const canBeRelationshipParticipant = (diagram: Diagram, nodeId: NodeId): boolean =>
  isEntity(diagram, nodeId)

export const canBeISAChild = (diagram: Diagram, nodeId: NodeId): boolean => {
  const n = diagram.nodesById[nodeId]
  if (!n || !isEntityNode(n) || n.isWeak) return false
  // Already a child of some ISA?
  for (const edge of incidentEdges(diagram, nodeId)) {
    if (isIsaEdge(edge) && edge.role === 'child' && edge.targetId === nodeId) return false
  }
  return true
}
