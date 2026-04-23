import { describe, it, expect } from 'vitest'
import { emptyDiagram } from '@/domain/types'
import { makeEntity, makeAttribute, makeIsa } from '@fixtures/diagrams/makeNode'
import { makeEREdge, makeAttrEdge, makeIsaEdge } from '@fixtures/diagrams/makeEdge'
import { makeDiagram } from '@fixtures/diagrams/makeDiagram'
import { diagramToRf } from './diagramToRf'

describe('diagramToRf', () => {
  it('maps empty diagram to empty arrays', () => {
    const rf = diagramToRf(emptyDiagram())
    expect(rf.nodes).toEqual([])
    expect(rf.edges).toEqual([])
  })

  it('maps an entity node to an RfNode with type=entity and data.nodeId', () => {
    const entity = makeEntity({
      name: 'A',
      position: { x: 10, y: 20 },
      size: { width: 120, height: 60 },
    })
    const d = makeDiagram([entity])
    const rf = diagramToRf(d)
    expect(rf.nodes).toHaveLength(1)
    expect(rf.nodes[0]).toEqual({
      id: entity.id,
      type: 'entity',
      position: { x: 10, y: 20 },
      data: { nodeId: entity.id },
      // RF v12: we pass dimensions as `initialWidth`/`initialHeight` (user-
      // writable hints) and let RF compute the read-only `width`/`height`
      // from the measured DOM.
      initialWidth: 120,
      initialHeight: 60,
    })
  })

  it('preserves nodeOrder z-order', () => {
    const a = makeEntity({ name: 'A' })
    const b = makeEntity({ name: 'B' })
    const d = makeDiagram([a, b])
    const rf = diagramToRf(d)
    expect(rf.nodes.map((n) => n.id)).toEqual([a.id, b.id])
  })

  it('maps an entity-relationship edge to an RfEdge with type=entity-relationship and data.edgeId', () => {
    const a = makeEntity({ name: 'A' })
    const b = makeEntity({ name: 'B' })
    const edge = makeEREdge(a.id, b.id, { cardinality: '1', participation: 'total' })
    const d = makeDiagram([a, b], [edge])
    const rf = diagramToRf(d)
    expect(rf.edges).toHaveLength(1)
    expect(rf.edges[0]).toEqual({
      id: edge.id,
      source: a.id,
      target: b.id,
      type: 'entity-relationship',
      data: { edgeId: edge.id },
    })
  })

  it('preserves edgeOrder', () => {
    const a = makeEntity()
    const b = makeEntity()
    const e1 = makeEREdge(a.id, b.id)
    const e2 = makeEREdge(a.id, b.id)
    const d = makeDiagram([a, b], [e1, e2])
    const rf = diagramToRf(d)
    expect(rf.edges.map((e) => e.id)).toEqual([e1.id, e2.id])
  })

  it('maps attribute-of and isa-link edges with correct type strings', () => {
    const entity = makeEntity({ name: 'Person' })
    const attr = makeAttribute({ name: 'name' })
    const isa = makeIsa()
    const attrEdge = makeAttrEdge(attr.id, entity.id)
    const isaEdge = makeIsaEdge(entity.id, isa.id, 'parent')
    const d = makeDiagram([entity, attr, isa], [attrEdge, isaEdge])
    const rf = diagramToRf(d)
    expect(rf.edges).toHaveLength(2)
    const byId = Object.fromEntries(rf.edges.map((e) => [e.id, e]))
    expect(byId[attrEdge.id]).toEqual({
      id: attrEdge.id,
      source: attr.id,
      target: entity.id,
      type: 'attribute-of',
      data: { edgeId: attrEdge.id },
    })
    expect(byId[isaEdge.id]).toEqual({
      id: isaEdge.id,
      source: entity.id,
      target: isa.id,
      type: 'isa-link',
      data: { edgeId: isaEdge.id },
    })
  })
})
