import { describe, it, expect } from 'vitest'
import { danglingEdgeRule, structuralRules } from './structural'
import { makeDiagram } from '@fixtures/diagrams/makeDiagram'
import { makeEntity } from '@fixtures/diagrams/makeNode'
import { makeEREdge } from '@fixtures/diagrams/makeEdge'
import { asNodeId } from '@/domain/id'
import { strongEntityWithKey } from '@fixtures/diagrams/composed'

describe('danglingEdgeRule', () => {
  it('fires when an edge references a missing node', () => {
    const e = makeEntity({ name: 'X' })
    const missing = asNodeId('missing__1')
    const d = makeDiagram([e], [makeEREdge(e.id, missing)])
    expect(danglingEdgeRule.check(d).length).toBeGreaterThan(0)
  })

  it('does not fire on a healthy diagram', () => {
    expect(danglingEdgeRule.check(strongEntityWithKey())).toEqual([])
  })
})

describe('structuralRules barrel', () => {
  it('exports exactly 1 rule', () => {
    expect(structuralRules).toHaveLength(1)
  })

  it('every rule id is unique and prefixed chen.structural.*', () => {
    const ids = structuralRules.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => id.startsWith('chen.structural.'))).toBe(true)
  })
})
