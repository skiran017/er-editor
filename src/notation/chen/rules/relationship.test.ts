import { describe, it, expect } from 'vitest'
import {
  relationshipMinTwoEntitiesRule,
  relationshipCardinalityRequiredRule,
  relationshipParticipationRequiredRule,
  identifyingRelationshipNeedsWeakRule,
  nonIdentifyingNotWeakRule,
  relationshipNameUniqueRule,
  recursiveRolesDistinctRule,
  relationshipRules,
} from './relationship'
import { makeDiagram } from '@fixtures/diagrams/makeDiagram'
import { makeEntity, makeRelationship } from '@fixtures/diagrams/makeNode'
import { makeEREdge } from '@fixtures/diagrams/makeEdge'
import {
  weakEntityWithDiscriminant, naryRelationship, recursiveRelationship,
} from '@fixtures/diagrams/composed'

describe('relationshipMinTwoEntitiesRule', () => {
  it('fires for relationship with only 1 ER edge', () => {
    const e = makeEntity({ name: 'A' })
    const r = makeRelationship({ name: 'Rel' })
    const d = makeDiagram([e, r], [makeEREdge(e.id, r.id)])
    expect(relationshipMinTwoEntitiesRule.check(d).map((x) => x.targetId)).toContain(r.id)
  })

  it('does not fire for binary relationship', () => {
    expect(relationshipMinTwoEntitiesRule.check(weakEntityWithDiscriminant())).toEqual([])
  })

  it('does not fire for recursive (2 edges to same entity)', () => {
    expect(relationshipMinTwoEntitiesRule.check(recursiveRelationship())).toEqual([])
  })
})

describe('relationshipCardinalityRequiredRule', () => {
  it('fires per-edge when an incident ER edge has no cardinality', () => {
    const e1 = makeEntity({ name: 'A' })
    const e2 = makeEntity({ name: 'B' })
    const r = makeRelationship({ name: 'Rel' })
    const bad = makeEREdge(e1.id, r.id)
    // Force invalid (cast for test)
    ;(bad as { cardinality: unknown }).cardinality = ''
    const d = makeDiagram([e1, e2, r], [bad, makeEREdge(e2.id, r.id)])
    expect(relationshipCardinalityRequiredRule.check(d).map((x) => x.targetId)).toContain(bad.id)
  })

  it('does not fire on healthy relationship', () => {
    expect(relationshipCardinalityRequiredRule.check(naryRelationship())).toEqual([])
  })
})

describe('relationshipParticipationRequiredRule', () => {
  it('fires per-edge when an incident ER edge has invalid participation', () => {
    const e1 = makeEntity({ name: 'A' })
    const e2 = makeEntity({ name: 'B' })
    const r = makeRelationship({ name: 'Rel' })
    const bad = makeEREdge(e1.id, r.id)
    ;(bad as { participation: unknown }).participation = 'maybe'
    const d = makeDiagram([e1, e2, r], [bad, makeEREdge(e2.id, r.id)])
    expect(relationshipParticipationRequiredRule.check(d).map((x) => x.targetId)).toContain(bad.id)
  })

  it('does not fire on healthy relationship', () => {
    expect(relationshipParticipationRequiredRule.check(naryRelationship())).toEqual([])
  })
})

describe('identifyingRelationshipNeedsWeakRule', () => {
  it('fires when identifying rel has no weak participant', () => {
    const a = makeEntity({ name: 'A' })
    const b = makeEntity({ name: 'B' })
    const r = makeRelationship({ name: 'R', isIdentifying: true })
    const d = makeDiagram([a, b, r], [
      makeEREdge(a.id, r.id, { cardinality: '1', participation: 'partial' }),
      makeEREdge(b.id, r.id, { cardinality: 'N', participation: 'total' }),
    ])
    expect(identifyingRelationshipNeedsWeakRule.check(d).map((x) => x.targetId)).toContain(r.id)
  })

  it('does not fire when identifying rel has a weak participant', () => {
    expect(identifyingRelationshipNeedsWeakRule.check(weakEntityWithDiscriminant())).toEqual([])
  })
})

describe('nonIdentifyingNotWeakRule', () => {
  // Fires when a non-identifying relationship connects a weak entity — the user
  // likely meant to mark the relationship as identifying.
  it('fires when non-identifying rel connects a weak entity', () => {
    const strong = makeEntity({ name: 'Building' })
    const weak = makeEntity({ name: 'Room', isWeak: true })
    const r = makeRelationship({ name: 'R', isIdentifying: false })
    const d = makeDiagram([strong, weak, r], [
      makeEREdge(strong.id, r.id, { cardinality: '1', participation: 'partial' }),
      makeEREdge(weak.id, r.id, { cardinality: 'N', participation: 'total' }),
    ])
    expect(nonIdentifyingNotWeakRule.check(d).map((x) => x.targetId)).toContain(r.id)
  })

  it('does not fire for a non-identifying rel with no weak participants', () => {
    expect(nonIdentifyingNotWeakRule.check(naryRelationship())).toEqual([])
  })

  it('does not fire for an identifying rel with a weak participant', () => {
    expect(nonIdentifyingNotWeakRule.check(weakEntityWithDiscriminant())).toEqual([])
  })
})

describe('relationshipNameUniqueRule', () => {
  it('fires when two relationships share a name (case-insensitive)', () => {
    const e1 = makeEntity({ name: 'A' })
    const e2 = makeEntity({ name: 'B' })
    const e3 = makeEntity({ name: 'C' })
    const r1 = makeRelationship({ name: 'Likes' })
    const r2 = makeRelationship({ name: 'likes' })
    const d = makeDiagram(
      [e1, e2, e3, r1, r2],
      [
        makeEREdge(e1.id, r1.id), makeEREdge(e2.id, r1.id),
        makeEREdge(e2.id, r2.id), makeEREdge(e3.id, r2.id),
      ],
    )
    const errs = relationshipNameUniqueRule.check(d)
    expect(errs.map((x) => x.targetId).sort()).toEqual([r1.id, r2.id].sort())
  })

  it('does not fire when names differ', () => {
    expect(relationshipNameUniqueRule.check(naryRelationship())).toEqual([])
  })
})

describe('recursiveRolesDistinctRule', () => {
  it('fires when recursive edges lack roles', () => {
    const e = makeEntity({ name: 'Emp' })
    const r = makeRelationship({ name: 'Boss' })
    const d = makeDiagram([e, r], [makeEREdge(e.id, r.id), makeEREdge(e.id, r.id)])
    expect(recursiveRolesDistinctRule.check(d).length).toBeGreaterThan(0)
  })

  it('fires when recursive edges share the same role', () => {
    const e = makeEntity({ name: 'Emp' })
    const r = makeRelationship({ name: 'Boss' })
    const d = makeDiagram([e, r], [
      makeEREdge(e.id, r.id, { role: 'x' }),
      makeEREdge(e.id, r.id, { role: 'x' }),
    ])
    expect(recursiveRolesDistinctRule.check(d).length).toBeGreaterThan(0)
  })

  it('does not fire when roles are distinct and non-empty', () => {
    expect(recursiveRolesDistinctRule.check(recursiveRelationship())).toEqual([])
  })
})

describe('relationshipRules barrel', () => {
  it('exports exactly 7 rules', () => {
    expect(relationshipRules).toHaveLength(7)
  })

  it('every rule id is unique and prefixed chen.relationship.*', () => {
    const ids = relationshipRules.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => id.startsWith('chen.relationship.'))).toBe(true)
  })
})
