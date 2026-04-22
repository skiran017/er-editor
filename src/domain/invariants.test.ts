import { describe, it, expect } from 'vitest'
import { checkInvariants } from './invariants'
import { asNodeId, asEdgeId } from './id'
import { emptyDiagram } from './types'
import type {
  Diagram, EntityNode, AttributeNode, RelationshipNode, ISANode,
  EntityRelationshipEdge, AttributeEdge, ISAEdge,
} from './types'

const nid = (v: string) => asNodeId(v.padEnd(10, '0').slice(0, 10))
const eid = (v: string) => asEdgeId(v.padEnd(10, '0').slice(0, 10))

const entity = (id: string, overrides: Partial<EntityNode> = {}): EntityNode => ({
  id: nid(id), kind: 'entity', name: id, isWeak: false,
  position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
  ...overrides,
})
const rel = (id: string, overrides: Partial<RelationshipNode> = {}): RelationshipNode => ({
  id: nid(id), kind: 'relationship', name: id, isIdentifying: false,
  position: { x: 0, y: 0 }, size: { width: 140, height: 70 },
  ...overrides,
})
const attr = (id: string, overrides: Partial<AttributeNode> = {}): AttributeNode => ({
  id: nid(id), kind: 'attribute', name: id,
  isKey: false, isDiscriminant: false, isMultivalued: false, isDerived: false, isComposite: false,
  position: { x: 0, y: 0 }, size: { width: 90, height: 50 },
  ...overrides,
})
const isa = (id: string): ISANode => ({
  id: nid(id), kind: 'isa', isTotal: false,
  position: { x: 0, y: 0 }, size: { width: 100, height: 60 },
})

const erEdge = (
  id: string, src: string, tgt: string, o: Partial<EntityRelationshipEdge> = {},
): EntityRelationshipEdge => ({
  id: eid(id), kind: 'entity-relationship',
  sourceId: nid(src), targetId: nid(tgt),
  cardinality: '1', participation: 'partial', waypoints: [], ...o,
})
const attrE = (id: string, src: string, tgt: string): AttributeEdge => ({
  id: eid(id), kind: 'attribute-of', sourceId: nid(src), targetId: nid(tgt), waypoints: [],
})
const isaE = (
  id: string, src: string, tgt: string, role: 'parent' | 'child',
): ISAEdge => ({
  id: eid(id), kind: 'isa-link', sourceId: nid(src), targetId: nid(tgt), role, waypoints: [],
})

const make = (
  nodes: readonly (EntityNode | RelationshipNode | AttributeNode | ISANode)[],
  edges: readonly (EntityRelationshipEdge | AttributeEdge | ISAEdge)[],
): Diagram => {
  const d = emptyDiagram()
  return {
    ...d,
    nodesById: Object.fromEntries(nodes.map((n) => [n.id, n])) as Diagram['nodesById'],
    edgesById: Object.fromEntries(edges.map((e) => [e.id, e])) as Diagram['edgesById'],
    nodeOrder: nodes.map((n) => n.id),
    edgeOrder: edges.map((e) => e.id),
  }
}

describe('invariant 1: every edge references existing nodes', () => {
  it('passes for a clean diagram', () => {
    const d = make([entity('e1'), rel('r1')], [erEdge('x1', 'e1', 'r1')])
    expect(checkInvariants(d).filter((v) => v.invariantId === 'INV-1')).toEqual([])
  })
  it('fires when an edge references a missing node', () => {
    const d = make([entity('e1')], [erEdge('x1', 'e1', 'missing__')])
    const v = checkInvariants(d).filter((x) => x.invariantId === 'INV-1')
    expect(v).toHaveLength(1)
  })
})

describe('invariant 2: attribute has exactly one outbound AttributeEdge', () => {
  it('passes when exactly one outbound', () => {
    const d = make(
      [entity('e1'), attr('a1')],
      [attrE('x1', 'a1', 'e1')],
    )
    expect(checkInvariants(d).filter((v) => v.invariantId === 'INV-2')).toEqual([])
  })
  it('fires when attribute has zero outbound attribute-of edges', () => {
    const d = make([entity('e1'), attr('a1')], [])
    const v = checkInvariants(d).filter((x) => x.invariantId === 'INV-2')
    expect(v).toHaveLength(1)
  })
  it('fires when attribute has multiple outbound attribute-of edges', () => {
    const d = make(
      [entity('e1'), entity('e2'), attr('a1')],
      [attrE('x1', 'a1', 'e1'), attrE('x2', 'a1', 'e2')],
    )
    const v = checkInvariants(d).filter((x) => x.invariantId === 'INV-2')
    expect(v).toHaveLength(1)
  })
})

describe('invariant 3: AttributeEdge targets Entity|Relationship|composite-Attribute', () => {
  it('passes for entity target', () => {
    const d = make([entity('e1'), attr('a1')], [attrE('x1', 'a1', 'e1')])
    expect(checkInvariants(d).filter((v) => v.invariantId === 'INV-3')).toEqual([])
  })
  it('passes for composite-attribute target', () => {
    const d = make(
      [attr('parentA', { isComposite: true }), attr('child__A')],
      [attrE('x1', 'child__A', 'parentA')],
    )
    expect(checkInvariants(d).filter((v) => v.invariantId === 'INV-3')).toEqual([])
  })
  it('fires for non-composite attribute target', () => {
    const d = make(
      [attr('parentA'), attr('child__A')],
      [attrE('x1', 'child__A', 'parentA')],
    )
    const v = checkInvariants(d).filter((x) => x.invariantId === 'INV-3')
    expect(v).toHaveLength(1)
  })
})

describe('invariant 4: isDiscriminant ⇒ parent is weak entity', () => {
  it('passes for discriminant on weak entity', () => {
    const d = make(
      [entity('e1', { isWeak: true }), attr('a1', { isDiscriminant: true })],
      [attrE('x1', 'a1', 'e1')],
    )
    expect(checkInvariants(d).filter((v) => v.invariantId === 'INV-4')).toEqual([])
  })
  it('fires when discriminant on strong entity', () => {
    const d = make(
      [entity('e1'), attr('a1', { isDiscriminant: true })],
      [attrE('x1', 'a1', 'e1')],
    )
    const v = checkInvariants(d).filter((x) => x.invariantId === 'INV-4')
    expect(v).toHaveLength(1)
  })
})

describe('invariant 5: Relationship has ≥2 EntityRelationshipEdges', () => {
  it('passes with 2 ER edges', () => {
    const d = make(
      [entity('e1'), entity('e2'), rel('r1')],
      [erEdge('x1', 'e1', 'r1'), erEdge('x2', 'e2', 'r1')],
    )
    expect(checkInvariants(d).filter((v) => v.invariantId === 'INV-5')).toEqual([])
  })
  it('fires with 1 ER edge', () => {
    const d = make(
      [entity('e1'), rel('r1')],
      [erEdge('x1', 'e1', 'r1')],
    )
    const v = checkInvariants(d).filter((x) => x.invariantId === 'INV-5')
    expect(v).toHaveLength(1)
  })
})

describe('invariant 6: ISA has exactly 1 parent + ≥1 child', () => {
  it('passes with 1 parent + 2 children', () => {
    const d = make(
      [entity('p1'), entity('c1'), entity('c2'), isa('i1')],
      [
        isaE('x1', 'p1', 'i1', 'parent'),
        isaE('x2', 'i1', 'c1', 'child'),
        isaE('x3', 'i1', 'c2', 'child'),
      ],
    )
    expect(checkInvariants(d).filter((v) => v.invariantId === 'INV-6')).toEqual([])
  })
  it('fires with no parent edges', () => {
    const d = make(
      [entity('c1'), isa('i1')],
      [isaE('x2', 'i1', 'c1', 'child')],
    )
    const v = checkInvariants(d).filter((x) => x.invariantId === 'INV-6')
    expect(v).toHaveLength(1)
  })
  it('fires with no child edges', () => {
    const d = make(
      [entity('p1'), isa('i1')],
      [isaE('x1', 'p1', 'i1', 'parent')],
    )
    const v = checkInvariants(d).filter((x) => x.invariantId === 'INV-6')
    expect(v).toHaveLength(1)
  })
})

describe('invariant 7: no ID collisions between nodes and edges', () => {
  it('passes with disjoint id spaces', () => {
    const d = make([entity('e1')], [])
    expect(checkInvariants(d).filter((v) => v.invariantId === 'INV-7')).toEqual([])
  })
  it('fires when a node id is also an edge id', () => {
    const d = make([entity('e1')], [erEdge('e1', 'e1', 'e1')])
    const v = checkInvariants(d).filter((x) => x.invariantId === 'INV-7')
    expect(v.length).toBeGreaterThanOrEqual(1)
  })
})

describe('invariant 8: nodeOrder/edgeOrder are permutations of keys', () => {
  it('passes when matching', () => {
    const d = make([entity('e1')], [])
    expect(checkInvariants(d).filter((v) => v.invariantId === 'INV-8')).toEqual([])
  })
  it('fires when nodeOrder misses an id', () => {
    const base = make([entity('e1'), entity('e2')], [])
    const d: Diagram = { ...base, nodeOrder: [base.nodeOrder[0]!] }
    const v = checkInvariants(d).filter((x) => x.invariantId === 'INV-8')
    expect(v).toHaveLength(1)
  })
})

describe('invariant 9: recursive ER edges have distinct non-empty roles', () => {
  it('passes when both roles present and distinct', () => {
    const d = make(
      [entity('e1'), rel('r1')],
      [
        erEdge('x1', 'e1', 'r1', { role: 'teacher' }),
        erEdge('x2', 'e1', 'r1', { role: 'student' }),
      ],
    )
    expect(checkInvariants(d).filter((v) => v.invariantId === 'INV-9')).toEqual([])
  })
  it('fires when roles are missing on recursive edges', () => {
    const d = make(
      [entity('e1'), rel('r1')],
      [erEdge('x1', 'e1', 'r1'), erEdge('x2', 'e1', 'r1')],
    )
    const v = checkInvariants(d).filter((x) => x.invariantId === 'INV-9')
    expect(v.length).toBeGreaterThanOrEqual(1)
  })
  it('fires when roles are equal on recursive edges', () => {
    const d = make(
      [entity('e1'), rel('r1')],
      [
        erEdge('x1', 'e1', 'r1', { role: 'same' }),
        erEdge('x2', 'e1', 'r1', { role: 'same' }),
      ],
    )
    const v = checkInvariants(d).filter((x) => x.invariantId === 'INV-9')
    expect(v.length).toBeGreaterThanOrEqual(1)
  })
})
