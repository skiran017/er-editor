import { describe, it, expect } from 'vitest'
import {
  isEntity, isRelationship, isAttribute, isISA,
  canHaveAttribute, isDifferentNode,
  canBeRelationshipParticipant, canBeISAChild,
} from './guards'
import { makeDiagram } from '@fixtures/diagrams/makeDiagram'
import { makeEntity, makeRelationship, makeAttribute, makeIsa } from '@fixtures/diagrams/makeNode'
import { makeIsaEdge } from '@fixtures/diagrams/makeEdge'
import { asNodeId } from '@/domain/id'

describe('isEntity / isRelationship / isAttribute / isISA', () => {
  it('discriminates by node kind', () => {
    const e = makeEntity({ name: 'E' })
    const r = makeRelationship({ name: 'R' })
    const a = makeAttribute({ name: 'a' })
    const i = makeIsa()
    const d = makeDiagram([e, r, a, i], [])

    expect(isEntity(d, e.id)).toBe(true)
    expect(isEntity(d, r.id)).toBe(false)
    expect(isRelationship(d, r.id)).toBe(true)
    expect(isAttribute(d, a.id)).toBe(true)
    expect(isISA(d, i.id)).toBe(true)
  })

  it('returns false for missing ids', () => {
    const d = makeDiagram([], [])
    expect(isEntity(d, asNodeId('missing_01'))).toBe(false)
    expect(isISA(d, asNodeId('missing_02'))).toBe(false)
  })
})

describe('canHaveAttribute', () => {
  it('true for entity and relationship', () => {
    const e = makeEntity({ name: 'E' })
    const r = makeRelationship({ name: 'R' })
    const d = makeDiagram([e, r], [])
    expect(canHaveAttribute(d, e.id)).toBe(true)
    expect(canHaveAttribute(d, r.id)).toBe(true)
  })
  it('false for attribute and isa', () => {
    const a = makeAttribute({ name: 'a' })
    const i = makeIsa()
    const d = makeDiagram([a, i], [])
    expect(canHaveAttribute(d, a.id)).toBe(false)
    expect(canHaveAttribute(d, i.id)).toBe(false)
  })
})

describe('isDifferentNode', () => {
  it('true when ids differ, false when equal', () => {
    const a = asNodeId('n000000001')
    const b = asNodeId('n000000002')
    expect(isDifferentNode(a, b)).toBe(true)
    expect(isDifferentNode(a, a)).toBe(false)
  })
  it('false when either id is null', () => {
    const a = asNodeId('n000000001')
    expect(isDifferentNode(null, a)).toBe(false)
    expect(isDifferentNode(a, null)).toBe(false)
  })
})

describe('canBeRelationshipParticipant', () => {
  it('true only for entities', () => {
    const e = makeEntity({ name: 'E' })
    const r = makeRelationship({ name: 'R' })
    const d = makeDiagram([e, r], [])
    expect(canBeRelationshipParticipant(d, e.id)).toBe(true)
    expect(canBeRelationshipParticipant(d, r.id)).toBe(false)
  })
})

describe('canBeISAChild', () => {
  it('true for an entity not already a child', () => {
    const e = makeEntity({ name: 'Child' })
    const d = makeDiagram([e], [])
    expect(canBeISAChild(d, e.id)).toBe(true)
  })
  it('false for entity already a child of an ISA', () => {
    const parent = makeEntity({ name: 'P' })
    const child = makeEntity({ name: 'C' })
    const isa = makeIsa()
    const d = makeDiagram(
      [parent, child, isa],
      [makeIsaEdge(parent.id, isa.id, 'parent'), makeIsaEdge(isa.id, child.id, 'child')],
    )
    expect(canBeISAChild(d, child.id)).toBe(false)
  })
  it('false for weak entities', () => {
    const weak = makeEntity({ name: 'W', isWeak: true })
    const d = makeDiagram([weak], [])
    expect(canBeISAChild(d, weak.id)).toBe(false)
  })
  it('false for non-entity kinds', () => {
    const r = makeRelationship({ name: 'R' })
    const d = makeDiagram([r], [])
    expect(canBeISAChild(d, r.id)).toBe(false)
  })
})
