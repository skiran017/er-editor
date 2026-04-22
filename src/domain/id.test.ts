import { describe, it, expect } from 'vitest'
import { newNodeId, newEdgeId, asNodeId, asEdgeId } from './id'

describe('newNodeId / newEdgeId', () => {
  it('returns 10-char strings', () => {
    expect(newNodeId()).toHaveLength(10)
    expect(newEdgeId()).toHaveLength(10)
  })

  it('returns URL-safe characters only', () => {
    const nodeId = newNodeId()
    const edgeId = newEdgeId()
    expect(nodeId).toMatch(/^[A-Za-z0-9_-]{10}$/)
    expect(edgeId).toMatch(/^[A-Za-z0-9_-]{10}$/)
  })

  it('produces unique ids across 1000 calls', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => newNodeId()))
    expect(ids.size).toBe(1000)
  })
})

describe('asNodeId / asEdgeId', () => {
  it('brands an existing string (for codec import paths)', () => {
    const raw = 'abc1234567'
    expect(asNodeId(raw)).toBe(raw)
    expect(asEdgeId(raw)).toBe(raw)
  })
})
