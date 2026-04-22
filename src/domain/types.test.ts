import { describe, it, expect, expectTypeOf } from 'vitest'
import {
  emptyDiagram,
  type Diagram,
  type NodeId,
  type EdgeId,
  type ERNode,
  type ERLink,
  type EntityNode,
  type AttributeNode,
  type EntityRelationshipEdge,
} from './types'

describe('emptyDiagram', () => {
  it('produces a v1 diagram with empty maps and orders', () => {
    const d = emptyDiagram()

    expect(d.schemaVersion).toBe(1)
    expect(d.nodesById).toEqual({})
    expect(d.edgesById).toEqual({})
    expect(d.nodeOrder).toEqual([])
    expect(d.edgeOrder).toEqual([])
  })
})

describe('type shape', () => {
  it('NodeId and EdgeId are nominally distinct from string', () => {
    expectTypeOf<NodeId>().not.toEqualTypeOf<string>()
    expectTypeOf<EdgeId>().not.toEqualTypeOf<string>()
    expectTypeOf<NodeId>().not.toEqualTypeOf<EdgeId>()
  })

  it('ERNode discriminates on kind', () => {
    expectTypeOf<Extract<ERNode, { kind: 'entity' }>>().toEqualTypeOf<EntityNode>()
    expectTypeOf<Extract<ERNode, { kind: 'attribute' }>>().toEqualTypeOf<AttributeNode>()
  })

  it('ERLink discriminates on kind', () => {
    expectTypeOf<Extract<ERLink, { kind: 'entity-relationship' }>>().toEqualTypeOf<EntityRelationshipEdge>()
  })

  it('Diagram maps are readonly', () => {
    expectTypeOf<Diagram['nodesById']>().toEqualTypeOf<Readonly<Record<NodeId, ERNode>>>()
  })
})
