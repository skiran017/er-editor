import { describe, it, expect } from 'vitest'
import {
  isaParentExistsRule,
  isaHasChildrenRule,
  isaSingleChildWarningRule,
  generalizationRules,
} from './generalization'
import { makeDiagram } from '@fixtures/diagrams/makeDiagram'
import { makeEntity, makeIsa } from '@fixtures/diagrams/makeNode'
import { makeIsaEdge } from '@fixtures/diagrams/makeEdge'
import { isaHierarchy } from '@fixtures/diagrams/composed'

describe('isaParentExistsRule', () => {
  it('fires for ISA without a parent edge', () => {
    const c = makeEntity({ name: 'Child' })
    const i = makeIsa()
    const d = makeDiagram([c, i], [makeIsaEdge(i.id, c.id, 'child')])
    expect(isaParentExistsRule.check(d).map((e) => e.targetId)).toContain(i.id)
  })

  it('does not fire on a healthy ISA hierarchy', () => {
    expect(isaParentExistsRule.check(isaHierarchy())).toEqual([])
  })
})

describe('isaHasChildrenRule', () => {
  it('fires for ISA without child edges', () => {
    const p = makeEntity({ name: 'Parent' })
    const i = makeIsa()
    const d = makeDiagram([p, i], [makeIsaEdge(p.id, i.id, 'parent')])
    expect(isaHasChildrenRule.check(d).map((e) => e.targetId)).toContain(i.id)
  })

  it('does not fire on a healthy ISA', () => {
    expect(isaHasChildrenRule.check(isaHierarchy())).toEqual([])
  })
})

describe('isaSingleChildWarningRule', () => {
  it('fires when ISA has exactly one child', () => {
    const p = makeEntity({ name: 'Parent' })
    const c1 = makeEntity({ name: 'C1' })
    const i = makeIsa()
    const d = makeDiagram([p, c1, i], [
      makeIsaEdge(p.id, i.id, 'parent'),
      makeIsaEdge(i.id, c1.id, 'child'),
    ])
    const errs = isaSingleChildWarningRule.check(d)
    expect(errs.map((e) => e.targetId)).toContain(i.id)
    expect(errs[0]?.severity).toBe('warning')
  })

  it('does not fire when ISA has ≥2 children', () => {
    expect(isaSingleChildWarningRule.check(isaHierarchy())).toEqual([])
  })
})

describe('generalizationRules barrel', () => {
  it('exports exactly 3 rules', () => {
    expect(generalizationRules).toHaveLength(3)
  })

  it('every rule id is unique and prefixed chen.generalization.*', () => {
    const ids = generalizationRules.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => id.startsWith('chen.generalization.'))).toBe(true)
  })
})
