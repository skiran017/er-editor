import { describe, it, expect } from 'vitest'
import type {
  JavaModel,
  JavaStrongEntitySet,
  JavaWeakEntitySet,
  JavaRelationshipSet,
} from './types'
import { isStrongEntity, isWeakEntity, isIdentifyingRelationship } from './types'

describe('JavaModel discriminants', () => {
  it('isStrongEntity narrows the union', () => {
    const e: JavaStrongEntitySet = {
      _kind: 'StrongEntitySet',
      id: 1,
      name: 'E',
      attributes: [],
      primaryKey: [],
    }
    expect(isStrongEntity(e)).toBe(true)
  })

  it('isWeakEntity narrows the union', () => {
    const w: JavaWeakEntitySet = {
      _kind: 'WeakEntitySet',
      id: 1,
      name: 'W',
      attributes: [],
      discriminant: [],
    }
    expect(isStrongEntity(w)).toBe(false)
    expect(isWeakEntity(w)).toBe(true)
  })

  it('isIdentifyingRelationship matches the three Identifying* class names', () => {
    const r: JavaRelationshipSet = {
      _kind: 'IdentifyingRelationshipSetOneToN',
      id: 1, name: 'R', attributes: [], branches: [],
    }
    expect(isIdentifyingRelationship(r)).toBe(true)
    expect(isIdentifyingRelationship({ ...r, _kind: 'RelationshipSetOneToN' })).toBe(false)
  })

  it('JavaModel composes schema + diagram sections', () => {
    const m: JavaModel = {
      schema: { name: 'S', lastId: 0, entities: [], relationships: [], generalizations: [] },
      diagram: { positions: new Map() },
    }
    expect(m.schema.name).toBe('S')
  })
})
