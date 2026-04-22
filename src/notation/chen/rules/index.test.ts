import { describe, it, expect } from 'vitest'
import { chenRules, validateChen } from './index'
import { emptyDiagram } from '@/domain/types'
import {
  strongEntityWithKey, weakEntityWithDiscriminant, naryRelationship,
  recursiveRelationship, isaHierarchy, compositeAttribute,
} from '@fixtures/diagrams/composed'

describe('chenRules', () => {
  it('exports exactly 33 rules', () => {
    expect(chenRules).toHaveLength(33)
  })

  it('every rule id is unique', () => {
    const ids = chenRules.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every rule id starts with chen.<category>.', () => {
    for (const rule of chenRules) {
      expect(rule.id).toMatch(new RegExp(`^chen\\.${rule.category}\\.`))
    }
  })

  it('every rule has a messageKey-able shape (structural smoke)', () => {
    for (const rule of chenRules) {
      expect(typeof rule.check).toBe('function')
      expect(['error', 'warning']).toContain(rule.severity)
    }
  })
})

describe('validateChen on canonical fixtures', () => {
  it('empty diagram: no errors', () => {
    expect(validateChen(emptyDiagram())).toEqual([])
  })

  it('strongEntityWithKey: no errors (except orphan-warning for the Student with no relationships)', () => {
    const errs = validateChen(strongEntityWithKey())
    // Only acceptable finding is the orphan-warning for Student (no relationships).
    expect(errs.map((e) => e.ruleId)).toEqual(['chen.entity.orphan-warning'])
  })

  it('weakEntityWithDiscriminant: no errors', () => {
    expect(validateChen(weakEntityWithDiscriminant())).toEqual([])
  })

  it('naryRelationship: only orphan-warnings (these entities have no attributes)', () => {
    const errs = validateChen(naryRelationship())
    const ids = errs.map((e) => e.ruleId)
    // n-ary has 3 entities with no attributes → 3 must-have-key + 3 must-have-attribute.
    expect(ids.filter((id) => id === 'chen.entity.must-have-attribute')).toHaveLength(3)
    expect(ids.filter((id) => id === 'chen.entity.must-have-key')).toHaveLength(3)
  })

  it('recursiveRelationship: no errors', () => {
    expect(validateChen(recursiveRelationship())).toEqual([])
  })

  it('isaHierarchy: no errors', () => {
    expect(validateChen(isaHierarchy())).toEqual([])
  })

  it('compositeAttribute: only orphan-warning (Person has no relationships in this fixture)', () => {
    const errs = validateChen(compositeAttribute())
    expect(errs.map((e) => e.ruleId)).toEqual(['chen.entity.orphan-warning'])
  })
})

describe('validateChen rule-id coverage', () => {
  it('aggregates exactly the sum of category rule counts', () => {
    // 10 + 7 + 12 + 3 + 1 = 33
    const categoryCounts = chenRules.reduce<Record<string, number>>((acc, r) => {
      acc[r.category] = (acc[r.category] ?? 0) + 1
      return acc
    }, {})
    expect(categoryCounts).toEqual({
      entity: 10,
      relationship: 7,
      attribute: 12,
      generalization: 3,
      structural: 1,
    })
  })
})
