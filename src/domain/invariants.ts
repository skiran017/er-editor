import type { InvariantViolation } from './types'
import type { Diagram, NodeId } from './types'
import { incidentEdges, isAttributeEdge, isAttributeNode, isEntityNode, isEntityRelationshipEdge, isIsaEdge, isIsaNode, isRelationshipNode } from './graph'

export const checkInvariants = (diagram: Diagram): readonly InvariantViolation[] => {
  const out: InvariantViolation[] = []

  // INV-1: every edge references existing nodes.
  for (const edgeId of diagram.edgeOrder) {
    const edge = diagram.edgesById[edgeId]
    if (!edge) continue
    if (!diagram.nodesById[edge.sourceId]) {
      out.push({ invariantId: 'INV-1', targetId: edge.id, detail: `dangling sourceId ${edge.sourceId}` })
    }
    if (!diagram.nodesById[edge.targetId]) {
      out.push({ invariantId: 'INV-1', targetId: edge.id, detail: `dangling targetId ${edge.targetId}` })
    }
  }

  // INV-2 + INV-3: attribute outbound parentage.
  for (const nodeId of diagram.nodeOrder) {
    const node = diagram.nodesById[nodeId]
    if (!node || !isAttributeNode(node)) continue

    const outbound = incidentEdges(diagram, node.id)
      .filter(isAttributeEdge)
      .filter((e) => e.sourceId === node.id)

    if (outbound.length !== 1) {
      out.push({
        invariantId: 'INV-2',
        targetId: node.id,
        detail: `attribute has ${outbound.length} outbound attribute-of edges (expected 1)`,
      })
    }

    for (const edge of outbound) {
      const parent = diagram.nodesById[edge.targetId]
      if (!parent) continue
      const legal = isEntityNode(parent) || isRelationshipNode(parent) || (isAttributeNode(parent) && parent.isComposite)
      if (!legal) {
        out.push({
          invariantId: 'INV-3',
          targetId: edge.id,
          detail: `attribute-of target ${parent.id} is ${parent.kind}${isAttributeNode(parent) ? ' (not composite)' : ''}`,
        })
      }
    }

    // INV-4: discriminant ⇒ parent is weak entity.
    if (node.isDiscriminant && outbound.length === 1) {
      const parent = diagram.nodesById[outbound[0]!.targetId]
      if (parent && (!isEntityNode(parent) || !parent.isWeak)) {
        out.push({
          invariantId: 'INV-4',
          targetId: node.id,
          detail: 'discriminant must attach to a weak entity',
        })
      }
    }
  }

  // INV-5: relationship has ≥2 EntityRelationshipEdges (except when isolated / being drawn — we fire here; runtime path that creates an isolated rel sets this up intentionally and callers filter).
  for (const nodeId of diagram.nodeOrder) {
    const node = diagram.nodesById[nodeId]
    if (!node || !isRelationshipNode(node)) continue
    const erCount = incidentEdges(diagram, node.id).filter(isEntityRelationshipEdge).length
    if (erCount < 2) {
      out.push({
        invariantId: 'INV-5',
        targetId: node.id,
        detail: `relationship has ${erCount} entity-relationship edges (need ≥2)`,
      })
    }
  }

  // INV-6: ISA has exactly one parent ISAEdge + ≥1 child ISAEdge.
  for (const nodeId of diagram.nodeOrder) {
    const node = diagram.nodesById[nodeId]
    if (!node || !isIsaNode(node)) continue
    const isaEdges = incidentEdges(diagram, node.id).filter(isIsaEdge)
    const parents = isaEdges.filter((e) => e.role === 'parent' && e.targetId === node.id)
    const children = isaEdges.filter((e) => e.role === 'child' && e.sourceId === node.id)
    if (parents.length !== 1) {
      out.push({ invariantId: 'INV-6', targetId: node.id, detail: `isa has ${parents.length} parent edges (expected 1)` })
    }
    if (children.length < 1) {
      out.push({ invariantId: 'INV-6', targetId: node.id, detail: `isa has ${children.length} child edges (need ≥1)` })
    }
  }

  // INV-7: no ID collision between nodes and edges.
  const nodeIds = new Set(Object.keys(diagram.nodesById))
  for (const edgeId of Object.keys(diagram.edgesById)) {
    if (nodeIds.has(edgeId)) {
      out.push({ invariantId: 'INV-7', targetId: edgeId as NodeId, detail: `id collision between node and edge: ${edgeId}` })
    }
  }

  // INV-8: nodeOrder / edgeOrder permutations of key sets.
  if (!setsEqual(new Set(diagram.nodeOrder), new Set(Object.keys(diagram.nodesById)))) {
    out.push({ invariantId: 'INV-8', targetId: '' as NodeId, detail: 'nodeOrder is not a permutation of nodesById keys' })
  }
  if (!setsEqual(new Set(diagram.edgeOrder), new Set(Object.keys(diagram.edgesById)))) {
    out.push({ invariantId: 'INV-8', targetId: '' as NodeId, detail: 'edgeOrder is not a permutation of edgesById keys' })
  }

  // INV-9: recursive ER edges (same entity on both ends of same relationship) require distinct non-empty roles.
  for (const nodeId of diagram.nodeOrder) {
    const node = diagram.nodesById[nodeId]
    if (!node || !isRelationshipNode(node)) continue
    const ers = incidentEdges(diagram, node.id).filter(isEntityRelationshipEdge)

    // Group edges by the "other" entity id; a group ≥2 means recursive.
    const groups = new Map<NodeId, typeof ers[number][]>()
    for (const e of ers) {
      const other = (e.sourceId === node.id ? e.targetId : e.sourceId)
      const list = groups.get(other) ?? []
      list.push(e)
      groups.set(other, list)
    }
    for (const [, edges] of groups) {
      if (edges.length < 2) continue
      const roles = edges.map((e) => (e.role ?? '').trim())
      const allNonEmpty = roles.every((r) => r.length > 0)
      const allDistinct = new Set(roles).size === roles.length
      if (!allNonEmpty || !allDistinct) {
        for (const e of edges) {
          out.push({ invariantId: 'INV-9', targetId: e.id, detail: 'recursive edges need distinct non-empty roles' })
        }
      }
    }
  }

  return out
}

const setsEqual = <T>(a: Set<T>, b: Set<T>): boolean => {
  if (a.size !== b.size) return false
  for (const v of a) if (!b.has(v)) return false
  return true
}
