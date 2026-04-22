import { describe, it, expect } from 'vitest'
import {
  attributeSingleParentRule,
  attributeNoDualParentRule,
  discriminantWeakOnlyRule,
  attributeNotKeyAndDerivedRule,
  keyNotMultivaluedRule,
  discriminantNotMultivaluedRule,
  relationshipAttributeNotKeyRule,
  attributeNameUniqueRule,
  compositeNeedsSubRule,
  subAttrNotKeyRule,
  subAttrNotDiscriminantRule,
  subAttrNotCompositeRule,
  attributeRules,
} from './attribute'
import { makeDiagram } from '@fixtures/diagrams/makeDiagram'
import { makeEntity, makeRelationship, makeAttribute } from '@fixtures/diagrams/makeNode'
import { makeAttrEdge, makeEREdge } from '@fixtures/diagrams/makeEdge'
import {
  strongEntityWithKey, weakEntityWithDiscriminant, compositeAttribute,
} from '@fixtures/diagrams/composed'

describe('attributeSingleParentRule', () => {
  it('fires for orphan attribute (no edge)', () => {
    const a = makeAttribute({ name: 'x' })
    const d = makeDiagram([a], [])
    expect(attributeSingleParentRule.check(d).map((e) => e.targetId)).toContain(a.id)
  })

  it('fires for attribute with two outbound parent edges', () => {
    const e1 = makeEntity({ name: 'A' })
    const e2 = makeEntity({ name: 'B' })
    const a = makeAttribute({ name: 'x' })
    const d = makeDiagram([e1, e2, a], [
      makeAttrEdge(a.id, e1.id),
      makeAttrEdge(a.id, e2.id),
    ])
    expect(attributeSingleParentRule.check(d).map((e) => e.targetId)).toContain(a.id)
  })

  it('does not fire for attribute with one parent edge', () => {
    expect(attributeSingleParentRule.check(strongEntityWithKey())).toEqual([])
  })
})

describe('attributeNoDualParentRule', () => {
  it('fires when attribute edges point to both entity and relationship', () => {
    const e = makeEntity({ name: 'A' })
    const e2 = makeEntity({ name: 'B' })
    const r = makeRelationship({ name: 'R' })
    const a = makeAttribute({ name: 'x' })
    const d = makeDiagram([e, e2, r, a], [
      makeEREdge(e.id, r.id), makeEREdge(e2.id, r.id),
      makeAttrEdge(a.id, e.id),
      makeAttrEdge(a.id, r.id),
    ])
    expect(attributeNoDualParentRule.check(d).map((x) => x.targetId)).toContain(a.id)
  })

  it('does not fire on healthy diagram', () => {
    expect(attributeNoDualParentRule.check(strongEntityWithKey())).toEqual([])
  })
})

describe('discriminantWeakOnlyRule', () => {
  it('fires for discriminant on a strong entity attribute', () => {
    const e = makeEntity({ name: 'X' })
    const a = makeAttribute({ name: 'd', isDiscriminant: true })
    const d = makeDiagram([e, a], [makeAttrEdge(a.id, e.id)])
    expect(discriminantWeakOnlyRule.check(d).map((x) => x.targetId)).toContain(a.id)
  })

  it('fires for discriminant on a relationship attribute', () => {
    const e1 = makeEntity({ name: 'A' })
    const e2 = makeEntity({ name: 'B' })
    const r = makeRelationship({ name: 'R' })
    const a = makeAttribute({ name: 'd', isDiscriminant: true })
    const d = makeDiagram([e1, e2, r, a], [
      makeEREdge(e1.id, r.id), makeEREdge(e2.id, r.id),
      makeAttrEdge(a.id, r.id),
    ])
    expect(discriminantWeakOnlyRule.check(d).map((x) => x.targetId)).toContain(a.id)
  })

  it('does not fire on weak-with-discriminant', () => {
    expect(discriminantWeakOnlyRule.check(weakEntityWithDiscriminant())).toEqual([])
  })
})

describe('attributeNotKeyAndDerivedRule', () => {
  it('fires when attribute is both key and derived', () => {
    const e = makeEntity({ name: 'X' })
    const a = makeAttribute({ name: 'x', isKey: true, isDerived: true })
    const d = makeDiagram([e, a], [makeAttrEdge(a.id, e.id)])
    expect(attributeNotKeyAndDerivedRule.check(d).map((x) => x.targetId)).toContain(a.id)
  })

  it('does not fire for key-only or derived-only attributes', () => {
    expect(attributeNotKeyAndDerivedRule.check(strongEntityWithKey())).toEqual([])
  })
})

describe('keyNotMultivaluedRule', () => {
  it('fires when key is multivalued', () => {
    const e = makeEntity({ name: 'X' })
    const a = makeAttribute({ name: 'x', isKey: true, isMultivalued: true })
    const d = makeDiagram([e, a], [makeAttrEdge(a.id, e.id)])
    expect(keyNotMultivaluedRule.check(d).map((x) => x.targetId)).toContain(a.id)
  })

  it('does not fire for single-valued key', () => {
    expect(keyNotMultivaluedRule.check(strongEntityWithKey())).toEqual([])
  })
})

describe('discriminantNotMultivaluedRule', () => {
  it('fires when discriminant is multivalued', () => {
    const e = makeEntity({ name: 'X', isWeak: true })
    const a = makeAttribute({ name: 'x', isDiscriminant: true, isMultivalued: true })
    const d = makeDiagram([e, a], [makeAttrEdge(a.id, e.id)])
    expect(discriminantNotMultivaluedRule.check(d).map((x) => x.targetId)).toContain(a.id)
  })

  it('does not fire on canonical weak-with-discriminant', () => {
    expect(discriminantNotMultivaluedRule.check(weakEntityWithDiscriminant())).toEqual([])
  })
})

describe('relationshipAttributeNotKeyRule', () => {
  it('fires when attribute of a relationship is key', () => {
    const e1 = makeEntity({ name: 'A' })
    const e2 = makeEntity({ name: 'B' })
    const r = makeRelationship({ name: 'R' })
    const a = makeAttribute({ name: 'x', isKey: true })
    const d = makeDiagram([e1, e2, r, a], [
      makeEREdge(e1.id, r.id), makeEREdge(e2.id, r.id),
      makeAttrEdge(a.id, r.id),
    ])
    expect(relationshipAttributeNotKeyRule.check(d).map((x) => x.targetId)).toContain(a.id)
  })

  it('does not fire when relationship attribute is non-key', () => {
    const e1 = makeEntity({ name: 'A' })
    const e2 = makeEntity({ name: 'B' })
    const r = makeRelationship({ name: 'R' })
    const a = makeAttribute({ name: 'since', isKey: false })
    const d = makeDiagram([e1, e2, r, a], [
      makeEREdge(e1.id, r.id), makeEREdge(e2.id, r.id),
      makeAttrEdge(a.id, r.id),
    ])
    expect(relationshipAttributeNotKeyRule.check(d)).toEqual([])
  })
})

describe('attributeNameUniqueRule', () => {
  it('fires when two attributes of the same entity share a name', () => {
    const e = makeEntity({ name: 'E' })
    const a1 = makeAttribute({ name: 'name' })
    const a2 = makeAttribute({ name: 'NAME' })
    const d = makeDiagram([e, a1, a2], [
      makeAttrEdge(a1.id, e.id),
      makeAttrEdge(a2.id, e.id),
    ])
    expect(attributeNameUniqueRule.check(d).map((x) => x.targetId).sort())
      .toEqual([a1.id, a2.id].sort())
  })

  it('does not fire when same name on different entities', () => {
    const e1 = makeEntity({ name: 'A' })
    const e2 = makeEntity({ name: 'B' })
    const a1 = makeAttribute({ name: 'id', isKey: true })
    const a2 = makeAttribute({ name: 'id', isKey: true })
    const d = makeDiagram([e1, e2, a1, a2], [
      makeAttrEdge(a1.id, e1.id),
      makeAttrEdge(a2.id, e2.id),
    ])
    expect(attributeNameUniqueRule.check(d)).toEqual([])
  })
})

describe('compositeNeedsSubRule', () => {
  it('fires for composite attribute with no sub-attributes', () => {
    const e = makeEntity({ name: 'E' })
    const c = makeAttribute({ name: 'addr', isComposite: true })
    const d = makeDiagram([e, c], [makeAttrEdge(c.id, e.id)])
    expect(compositeNeedsSubRule.check(d).map((x) => x.targetId)).toContain(c.id)
  })

  it('does not fire on canonical composite', () => {
    expect(compositeNeedsSubRule.check(compositeAttribute())).toEqual([])
  })
})

describe('subAttrNotKeyRule', () => {
  it('fires when sub-attribute is key', () => {
    const e = makeEntity({ name: 'E' })
    const parent = makeAttribute({ name: 'addr', isComposite: true })
    const child = makeAttribute({ name: 'street', isKey: true })
    const d = makeDiagram([e, parent, child], [
      makeAttrEdge(parent.id, e.id),
      makeAttrEdge(child.id, parent.id),
    ])
    expect(subAttrNotKeyRule.check(d).map((x) => x.targetId)).toContain(child.id)
  })

  it('does not fire on canonical composite', () => {
    expect(subAttrNotKeyRule.check(compositeAttribute())).toEqual([])
  })
})

describe('subAttrNotDiscriminantRule', () => {
  it('fires when sub-attribute is discriminant', () => {
    const e = makeEntity({ name: 'E' })
    const parent = makeAttribute({ name: 'addr', isComposite: true })
    const child = makeAttribute({ name: 'n', isDiscriminant: true })
    const d = makeDiagram([e, parent, child], [
      makeAttrEdge(parent.id, e.id),
      makeAttrEdge(child.id, parent.id),
    ])
    expect(subAttrNotDiscriminantRule.check(d).map((x) => x.targetId)).toContain(child.id)
  })

  it('does not fire on canonical composite', () => {
    expect(subAttrNotDiscriminantRule.check(compositeAttribute())).toEqual([])
  })
})

describe('subAttrNotCompositeRule', () => {
  it('fires when sub-attribute is also composite', () => {
    const e = makeEntity({ name: 'E' })
    const parent = makeAttribute({ name: 'addr', isComposite: true })
    const child = makeAttribute({ name: 'inner', isComposite: true })
    const grand = makeAttribute({ name: 'z' })
    const d = makeDiagram([e, parent, child, grand], [
      makeAttrEdge(parent.id, e.id),
      makeAttrEdge(child.id, parent.id),
      makeAttrEdge(grand.id, child.id),
    ])
    expect(subAttrNotCompositeRule.check(d).map((x) => x.targetId)).toContain(child.id)
  })

  it('does not fire on canonical composite', () => {
    expect(subAttrNotCompositeRule.check(compositeAttribute())).toEqual([])
  })
})

describe('attributeRules barrel', () => {
  it('exports exactly 12 rules', () => {
    expect(attributeRules).toHaveLength(12)
  })

  it('every rule id is unique and prefixed chen.attribute.*', () => {
    const ids = attributeRules.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => id.startsWith('chen.attribute.'))).toBe(true)
  })
})
