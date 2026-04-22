import { describe, it, expect } from 'vitest'
import * as adapters from './index'

describe('canvas/notation-adapters barrel', () => {
  it('re-exports all four node containers', () => {
    expect(adapters.EntityNode).toBeTruthy()
    expect(adapters.RelationshipNode).toBeTruthy()
    expect(adapters.AttributeNode).toBeTruthy()
    expect(adapters.ISANode).toBeTruthy()
  })

  it('re-exports all three edge containers', () => {
    expect(adapters.EntityRelationshipEdge).toBeTruthy()
    expect(adapters.AttributeEdge).toBeTruthy()
    expect(adapters.ISAEdge).toBeTruthy()
  })

  it('re-exports chenNodeTypes and chenEdgeTypes records', () => {
    expect(typeof adapters.chenNodeTypes).toBe('object')
    expect(typeof adapters.chenEdgeTypes).toBe('object')
  })
})
