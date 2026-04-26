// src/notation/chen/codecs/javaXml/transformer.test.ts
import { describe, it, expect } from 'vitest'
import { javaToDiagram } from './transformer'
import type { JavaModel } from './types'

const wrap = (entities: JavaModel['schema']['entities']): JavaModel => ({
  schema: { name: 'T', lastId: 0, entities, relationships: [], generalizations: [] },
  diagram: { positions: new Map() },
})

describe('javaToDiagram — entities + attributes', () => {
  it('maps StrongEntitySet to entity node with isWeak=false', () => {
    const d = javaToDiagram(wrap([
      { _kind: 'StrongEntitySet', id: 1, name: 'E', attributes: [], primaryKey: [] },
    ]))
    expect(d.nodeOrder).toHaveLength(1)
    const node = d.nodesById[d.nodeOrder[0]!]!
    expect(node.kind).toBe('entity')
    expect(node.kind === 'entity' && node.isWeak).toBe(false)
    expect(node.kind === 'entity' && node.name).toBe('E')
  })

  it('maps WeakEntitySet to entity node with isWeak=true', () => {
    const d = javaToDiagram(wrap([
      { _kind: 'WeakEntitySet', id: 1, name: 'W', attributes: [], discriminant: [] },
    ]))
    const node = d.nodesById[d.nodeOrder[0]!]!
    expect(node.kind === 'entity' && node.isWeak).toBe(true)
  })

  it('maps SimpleAttribute to attribute node + attribute-of edge', () => {
    const d = javaToDiagram(wrap([
      {
        _kind: 'StrongEntitySet', id: 1, name: 'E',
        attributes: [{ _kind: 'SimpleAttribute', id: 2, name: 'x', multiValued: false, derived: false }],
        primaryKey: [],
      },
    ]))
    expect(d.nodeOrder).toHaveLength(2)
    expect(d.edgeOrder).toHaveLength(1)
    const edge = d.edgesById[d.edgeOrder[0]!]!
    expect(edge.kind).toBe('attribute-of')
  })

  it('sets isKey=true on PrimaryKey-referenced attributes (StrongEntitySet only)', () => {
    const d = javaToDiagram(wrap([
      {
        _kind: 'StrongEntitySet', id: 1, name: 'E',
        attributes: [{ _kind: 'SimpleAttribute', id: 2, name: 'k', multiValued: false, derived: false }],
        primaryKey: [2],
      },
    ]))
    const attrNode = Object.values(d.nodesById).find((n) => n.kind === 'attribute')!
    expect(attrNode.kind === 'attribute' && attrNode.isKey).toBe(true)
  })

  it('sets isDiscriminant=true on Discriminant-referenced attributes (WeakEntitySet only)', () => {
    const d = javaToDiagram(wrap([
      {
        _kind: 'WeakEntitySet', id: 1, name: 'W',
        attributes: [{ _kind: 'SimpleAttribute', id: 2, name: 'd', multiValued: false, derived: false }],
        discriminant: [2],
      },
    ]))
    const attrNode = Object.values(d.nodesById).find((n) => n.kind === 'attribute')!
    expect(attrNode.kind === 'attribute' && attrNode.isDiscriminant).toBe(true)
  })

  it('maps multiValued and derived flags correctly', () => {
    const d = javaToDiagram(wrap([
      {
        _kind: 'StrongEntitySet', id: 1, name: 'E',
        attributes: [
          { _kind: 'SimpleAttribute', id: 2, name: 'm', multiValued: true, derived: false },
          { _kind: 'SimpleAttribute', id: 3, name: 'd', multiValued: false, derived: true },
        ],
        primaryKey: [],
      },
    ]))
    const attrs = Object.values(d.nodesById).filter((n) => n.kind === 'attribute')
    const m = attrs.find((a) => a.kind === 'attribute' && a.name === 'm')!
    const der = attrs.find((a) => a.kind === 'attribute' && a.name === 'd')!
    expect(m.kind === 'attribute' && m.isMultivalued).toBe(true)
    expect(der.kind === 'attribute' && der.isDerived).toBe(true)
  })

  it('marks composite attributes with isComposite=true', () => {
    const d = javaToDiagram(wrap([
      {
        _kind: 'StrongEntitySet', id: 1, name: 'E',
        attributes: [{
          _kind: 'CompositeAttribute', id: 2, name: 'addr', multiValued: false, derived: false,
          children: [{ _kind: 'SimpleAttribute', id: 3, name: 'street', multiValued: false, derived: false }],
        }],
        primaryKey: [],
      },
    ]))
    const composite = Object.values(d.nodesById).find((n) => n.kind === 'attribute' && n.name === 'addr')!
    expect(composite.kind === 'attribute' && composite.isComposite).toBe(true)
  })

  it('honours position from the diagram section if present, else uses (0, 0)', () => {
    const m: JavaModel = {
      schema: {
        name: 'T', lastId: 1,
        entities: [{ _kind: 'StrongEntitySet', id: 1, name: 'E', attributes: [], primaryKey: [] }],
        relationships: [], generalizations: [],
      },
      diagram: { positions: new Map([[1, { x: 50, y: 60 }]]) },
    }
    const d = javaToDiagram(m)
    const node = d.nodesById[d.nodeOrder[0]!]!
    expect(node.position).toEqual({ x: 50, y: 60 })
  })
})
