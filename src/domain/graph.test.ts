import { describe, it, expect } from 'vitest'
import {
  incidentEdges,
  neighbors,
  nodesByKind,
  edgesByKind,
  hasPath,
  isEntityNode,
  isRelationshipNode,
  isAttributeNode,
  isIsaNode,
  isEntityRelationshipEdge,
  isAttributeEdge,
  isIsaEdge,
} from './graph'
import { asNodeId, asEdgeId } from './id'
import type { Diagram, EntityNode, AttributeNode, AttributeEdge, EntityRelationshipEdge } from './types'

// Inline minimal diagram for graph tests (full fixtures land in Task 6).
const e1 = asNodeId('entity0001')
const e2 = asNodeId('entity0002')
const r1 = asNodeId('rel0000001')
const a1 = asNodeId('attr000001')
const edge1 = asEdgeId('edge000001')
const edge2 = asEdgeId('edge000002')
const edge3 = asEdgeId('edge000003')

const entityAt = (id: typeof e1, name: string): EntityNode => ({
  id, kind: 'entity', name, isWeak: false,
  position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
})

const attrAt = (id: typeof a1, name: string): AttributeNode => ({
  id, kind: 'attribute', name,
  isKey: false, isDiscriminant: false, isMultivalued: false, isDerived: false, isComposite: false,
  position: { x: 0, y: 0 }, size: { width: 90, height: 50 },
})

const erEdge = (id: typeof edge1, from: typeof e1, to: typeof r1): EntityRelationshipEdge => ({
  id, kind: 'entity-relationship', sourceId: from, targetId: to,
  cardinality: '1', participation: 'partial', waypoints: [],
})

const attrEdge = (id: typeof edge1, from: typeof a1, to: typeof e1): AttributeEdge => ({
  id, kind: 'attribute-of', sourceId: from, targetId: to, waypoints: [],
})

const diagram: Diagram = {
  schemaVersion: 1,
  nodesById: {
    [e1]: entityAt(e1, 'Student'),
    [e2]: entityAt(e2, 'Course'),
    [r1]: { id: r1, kind: 'relationship', name: 'Enrolls', isIdentifying: false,
      position: { x: 0, y: 0 }, size: { width: 140, height: 70 } },
    [a1]: attrAt(a1, 'name'),
  },
  edgesById: {
    [edge1]: erEdge(edge1, e1, r1),
    [edge2]: erEdge(edge2, e2, r1),
    [edge3]: attrEdge(edge3, a1, e1),
  },
  nodeOrder: [e1, e2, r1, a1],
  edgeOrder: [edge1, edge2, edge3],
}

describe('incidentEdges', () => {
  it('returns all edges touching the node', () => {
    const result = incidentEdges(diagram, e1).map((e) => e.id)
    expect(result).toEqual(expect.arrayContaining([edge1, edge3]))
    expect(result).toHaveLength(2)
  })
  it('returns [] for an unknown node', () => {
    expect(incidentEdges(diagram, asNodeId('missing000'))).toEqual([])
  })
})

describe('neighbors', () => {
  it('returns both endpoints of incident edges excluding self', () => {
    const ns = [...neighbors(diagram, r1)].sort()
    expect(ns).toEqual([e1, e2].sort())
  })
  it('filters by edge kind', () => {
    const ns = neighbors(diagram, e1, { edgeKind: 'attribute-of' })
    expect(ns).toEqual([a1])
  })
})

describe('nodesByKind', () => {
  it('returns nodes matching the kind in nodeOrder order', () => {
    const entities = nodesByKind(diagram, 'entity').map((n) => n.id)
    expect(entities).toEqual([e1, e2])
  })
})

describe('edgesByKind', () => {
  it('returns edges matching the kind in edgeOrder order', () => {
    const ers = edgesByKind(diagram, 'entity-relationship').map((e) => e.id)
    expect(ers).toEqual([edge1, edge2])
  })
})

describe('hasPath', () => {
  it('true for reachable nodes (e1 → r1 → e2)', () => {
    expect(hasPath(diagram, e1, e2)).toBe(true)
  })
  it('true for self', () => {
    expect(hasPath(diagram, e1, e1)).toBe(true)
  })
  it('false for unconnected nodes', () => {
    const isolated = asNodeId('iso0000001')
    const d2: Diagram = { ...diagram, nodesById: {
      ...diagram.nodesById,
      [isolated]: entityAt(isolated, 'Island'),
    }, nodeOrder: [...diagram.nodeOrder, isolated] }
    expect(hasPath(d2, e1, isolated)).toBe(false)
  })
})

describe('node type guards', () => {
  it('correctly discriminates', () => {
    expect(isEntityNode(diagram.nodesById[e1])).toBe(true)
    expect(isRelationshipNode(diagram.nodesById[r1])).toBe(true)
    expect(isAttributeNode(diagram.nodesById[a1])).toBe(true)
    expect(isIsaNode(diagram.nodesById[e1])).toBe(false)
  })
})

describe('edge type guards', () => {
  it('correctly discriminates', () => {
    expect(isEntityRelationshipEdge(diagram.edgesById[edge1])).toBe(true)
    expect(isAttributeEdge(diagram.edgesById[edge3])).toBe(true)
    expect(isIsaEdge(diagram.edgesById[edge1])).toBe(false)
  })
})
