import { describe, it, expect } from 'vitest'
import {
  strongEntityWithKey,
  weakEntityWithDiscriminant,
  naryRelationship,
  recursiveRelationship,
  isaHierarchy,
  compositeAttribute,
} from './composed'
import { checkInvariants } from '@/domain/invariants'

describe('composed fixtures', () => {
  it('strongEntityWithKey satisfies invariants', () => {
    expect(checkInvariants(strongEntityWithKey())).toEqual([])
  })
  it('weakEntityWithDiscriminant satisfies invariants', () => {
    expect(checkInvariants(weakEntityWithDiscriminant())).toEqual([])
  })
  it('naryRelationship satisfies invariants', () => {
    expect(checkInvariants(naryRelationship())).toEqual([])
  })
  it('recursiveRelationship satisfies invariants', () => {
    expect(checkInvariants(recursiveRelationship())).toEqual([])
  })
  it('isaHierarchy satisfies invariants', () => {
    expect(checkInvariants(isaHierarchy())).toEqual([])
  })
  it('compositeAttribute satisfies invariants', () => {
    expect(checkInvariants(compositeAttribute())).toEqual([])
  })
})
