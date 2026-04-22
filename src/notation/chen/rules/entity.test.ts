import { describe, it, expect } from 'vitest'
import {
  entityMustHaveKeyRule,
  weakEntityMissingDiscriminantRule,
  entityMustHaveAttributeRule,
  weakEntityTotalParticipationRule,
  weakEntityNotOn1SideRule,
  weakEntitySingleIdentifyingRule,
  entityNameUniqueRule,
  entityNameNonEmptyRule,
  orphanEntityWarningRule,
  weakEntityNoKeyRule,
  entityRules,
} from './entity'
import { makeDiagram } from '@fixtures/diagrams/makeDiagram'
import { makeEntity, makeRelationship, makeAttribute } from '@fixtures/diagrams/makeNode'
import { makeEREdge, makeAttrEdge } from '@fixtures/diagrams/makeEdge'
import {
  strongEntityWithKey, weakEntityWithDiscriminant, isaHierarchy,
} from '@fixtures/diagrams/composed'

describe('entityMustHaveKeyRule', () => {
  it('fires for strong entity without a key', () => {
    const e = makeEntity({ name: 'Student' })
    const a = makeAttribute({ name: 'name', isKey: false })
    const d = makeDiagram([e, a], [makeAttrEdge(a.id, e.id)])
    const errs = entityMustHaveKeyRule.check(d)
    expect(errs.map((x) => x.targetId)).toEqual([e.id])
  })

  it('does not fire for strong entity with a key', () => {
    expect(entityMustHaveKeyRule.check(strongEntityWithKey())).toEqual([])
  })

  it('does not fire for weak entity', () => {
    expect(entityMustHaveKeyRule.check(weakEntityWithDiscriminant())).toEqual([])
  })

  it('does not fire for ISA child', () => {
    expect(entityMustHaveKeyRule.check(isaHierarchy())).toEqual([])
  })
})

describe('weakEntityMissingDiscriminantRule', () => {
  it('fires for weak entity without discriminant', () => {
    const weak = makeEntity({ name: 'Room', isWeak: true })
    const d = makeDiagram([weak], [])
    expect(weakEntityMissingDiscriminantRule.check(d)).toHaveLength(1)
  })

  it('does not fire for weak with discriminant', () => {
    expect(weakEntityMissingDiscriminantRule.check(weakEntityWithDiscriminant())).toEqual([])
  })

  it('does not fire for strong entity', () => {
    expect(weakEntityMissingDiscriminantRule.check(strongEntityWithKey())).toEqual([])
  })
})

describe('entityMustHaveAttributeRule', () => {
  it('fires for entity with no attributes', () => {
    const e = makeEntity({ name: 'X' })
    const d = makeDiagram([e], [])
    expect(entityMustHaveAttributeRule.check(d)).toHaveLength(1)
  })

  it('does not fire when entity has attributes', () => {
    expect(entityMustHaveAttributeRule.check(strongEntityWithKey())).toEqual([])
  })

  it('does not fire for ISA child even with zero attributes', () => {
    // isaHierarchy's Student/Employee children have no attributes — inherit from parent
    expect(entityMustHaveAttributeRule.check(isaHierarchy())).toEqual([])
  })
})

describe('weakEntityTotalParticipationRule', () => {
  it('fires when weak participation is partial', () => {
    const bldg = makeEntity({ name: 'Building' })
    const room = makeEntity({ name: 'Room', isWeak: true })
    const disc = makeAttribute({ name: 'n', isDiscriminant: true })
    const rel = makeRelationship({ name: 'Located', isIdentifying: true })
    const d = makeDiagram(
      [bldg, room, disc, rel],
      [
        makeAttrEdge(disc.id, room.id),
        makeEREdge(bldg.id, rel.id, { cardinality: '1', participation: 'partial' }),
        makeEREdge(room.id, rel.id, { cardinality: 'N', participation: 'partial' }),
      ],
    )
    const errs = weakEntityTotalParticipationRule.check(d)
    expect(errs.map((e) => e.targetId)).toContain(room.id)
  })

  it('does not fire when weak participation is total', () => {
    expect(weakEntityTotalParticipationRule.check(weakEntityWithDiscriminant())).toEqual([])
  })
})

describe('weakEntityNotOn1SideRule', () => {
  it('fires when weak entity has cardinality 1 on identifying rel', () => {
    const bldg = makeEntity({ name: 'Building' })
    const room = makeEntity({ name: 'Room', isWeak: true })
    const disc = makeAttribute({ name: 'n', isDiscriminant: true })
    const rel = makeRelationship({ name: 'Located', isIdentifying: true })
    const d = makeDiagram(
      [bldg, room, disc, rel],
      [
        makeAttrEdge(disc.id, room.id),
        makeEREdge(bldg.id, rel.id, { cardinality: '1', participation: 'total' }),
        makeEREdge(room.id, rel.id, { cardinality: '1', participation: 'total' }),
      ],
    )
    expect(weakEntityNotOn1SideRule.check(d).map((e) => e.targetId)).toContain(room.id)
  })

  it('does not fire when weak is on N-side', () => {
    expect(weakEntityNotOn1SideRule.check(weakEntityWithDiscriminant())).toEqual([])
  })
})

describe('weakEntitySingleIdentifyingRule', () => {
  it('fires when weak connects to zero identifying rels', () => {
    const w = makeEntity({ name: 'Room', isWeak: true })
    const d = makeAttribute({ name: 'n', isDiscriminant: true })
    const diag = makeDiagram([w, d], [makeAttrEdge(d.id, w.id)])
    expect(weakEntitySingleIdentifyingRule.check(diag).map((e) => e.targetId)).toContain(w.id)
  })

  it('fires when weak connects to >1 identifying rels', () => {
    const bldg = makeEntity({ name: 'Building' })
    const room = makeEntity({ name: 'Room', isWeak: true })
    const disc = makeAttribute({ name: 'n', isDiscriminant: true })
    const rel1 = makeRelationship({ name: 'A', isIdentifying: true })
    const rel2 = makeRelationship({ name: 'B', isIdentifying: true })
    const other = makeEntity({ name: 'Other' })
    const d = makeDiagram(
      [bldg, room, disc, rel1, rel2, other],
      [
        makeAttrEdge(disc.id, room.id),
        makeEREdge(bldg.id, rel1.id, { cardinality: '1', participation: 'total' }),
        makeEREdge(room.id, rel1.id, { cardinality: 'N', participation: 'total' }),
        makeEREdge(other.id, rel2.id, { cardinality: '1', participation: 'total' }),
        makeEREdge(room.id, rel2.id, { cardinality: 'N', participation: 'total' }),
      ],
    )
    expect(weakEntitySingleIdentifyingRule.check(d).map((e) => e.targetId)).toContain(room.id)
  })

  it('does not fire for the canonical weak-with-discriminant fixture', () => {
    expect(weakEntitySingleIdentifyingRule.check(weakEntityWithDiscriminant())).toEqual([])
  })
})

describe('entityNameUniqueRule', () => {
  it('fires when two entities share a name (case-insensitive)', () => {
    const a = makeEntity({ name: 'Student' })
    const b = makeEntity({ name: 'STUDENT' })
    const d = makeDiagram([a, b], [])
    const errs = entityNameUniqueRule.check(d)
    expect(errs.map((e) => e.targetId).sort()).toEqual([a.id, b.id].sort())
  })

  it('does not fire when names differ', () => {
    expect(entityNameUniqueRule.check(isaHierarchy())).toEqual([])
  })
})

describe('entityNameNonEmptyRule', () => {
  it('fires when name is empty or whitespace', () => {
    const e1 = makeEntity({ name: '' })
    const e2 = makeEntity({ name: '   ' })
    const d = makeDiagram([e1, e2], [])
    expect(entityNameNonEmptyRule.check(d)).toHaveLength(2)
  })

  it('does not fire for populated names', () => {
    expect(entityNameNonEmptyRule.check(strongEntityWithKey())).toEqual([])
  })
})

describe('orphanEntityWarningRule', () => {
  it('fires when entity has no relationships', () => {
    const lonely = makeEntity({ name: 'Lonely' })
    const a = makeAttribute({ name: 'k', isKey: true })
    const d = makeDiagram([lonely, a], [makeAttrEdge(a.id, lonely.id)])
    const errs = orphanEntityWarningRule.check(d)
    expect(errs.map((e) => e.targetId)).toContain(lonely.id)
    expect(errs[0]?.severity).toBe('warning')
  })

  it('does not fire when the entity has a relationship', () => {
    expect(orphanEntityWarningRule.check(weakEntityWithDiscriminant())).toEqual([])
  })
})

describe('weakEntityNoKeyRule', () => {
  it('fires when weak entity has a key attribute', () => {
    const weak = makeEntity({ name: 'Room', isWeak: true })
    const k = makeAttribute({ name: 'x', isKey: true })
    const d = makeDiagram([weak, k], [makeAttrEdge(k.id, weak.id)])
    expect(weakEntityNoKeyRule.check(d).map((e) => e.targetId)).toContain(weak.id)
  })

  it('does not fire when weak entity only has a discriminant', () => {
    expect(weakEntityNoKeyRule.check(weakEntityWithDiscriminant())).toEqual([])
  })
})

describe('entityRules barrel', () => {
  it('exports exactly 10 rules', () => {
    expect(entityRules).toHaveLength(10)
  })

  it('every rule has a unique id prefixed chen.entity.*', () => {
    const ids = entityRules.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => id.startsWith('chen.entity.'))).toBe(true)
  })

  it('every rule has category=entity', () => {
    expect(entityRules.every((r) => r.category === 'entity')).toBe(true)
  })
})
