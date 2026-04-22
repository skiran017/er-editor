import { describe, it, expectTypeOf } from 'vitest'
import type { NodeInput, EdgeInput, DiagramPatch } from './types'
import type { EntityNode, AttributeEdge, ERNode } from '@/domain/types'

describe('NodeInput', () => {
  it('is ERNode minus id, per-variant', () => {
    type EntityInput = Extract<NodeInput, { kind: 'entity' }>
    expectTypeOf<EntityInput>().toEqualTypeOf<Omit<EntityNode, 'id'>>()
  })
  it('all 4 node kinds covered', () => {
    type Kinds = NodeInput['kind']
    expectTypeOf<Kinds>().toEqualTypeOf<ERNode['kind']>()
  })
})

describe('EdgeInput', () => {
  it('covers attribute-of', () => {
    type A = Extract<EdgeInput, { kind: 'attribute-of' }>
    expectTypeOf<A>().toEqualTypeOf<Omit<AttributeEdge, 'id'>>()
  })
})

describe('DiagramPatch', () => {
  it('has all six optional operation arrays', () => {
    expectTypeOf<DiagramPatch>().toHaveProperty('addNodes')
    expectTypeOf<DiagramPatch>().toHaveProperty('updateNodes')
    expectTypeOf<DiagramPatch>().toHaveProperty('removeNodes')
    expectTypeOf<DiagramPatch>().toHaveProperty('addEdges')
    expectTypeOf<DiagramPatch>().toHaveProperty('updateEdges')
    expectTypeOf<DiagramPatch>().toHaveProperty('removeEdges')
  })
})
