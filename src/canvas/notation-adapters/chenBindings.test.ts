import { describe, it, expect } from 'vitest'
import { chenNodeTypes, chenEdgeTypes } from './chenBindings'

describe('chenBindings', () => {
  it('nodeTypes exposes all four NodeKind → component entries', () => {
    expect(Object.keys(chenNodeTypes).sort()).toEqual([
      'attribute',
      'entity',
      'isa',
      'relationship',
    ])
    for (const k of Object.keys(chenNodeTypes)) {
      const entry = chenNodeTypes[k as keyof typeof chenNodeTypes]
      expect(entry).toBeTruthy()
      expect(['object', 'function']).toContain(typeof entry)
    }
  })

  it('edgeTypes exposes all three EdgeKind → component entries', () => {
    expect(Object.keys(chenEdgeTypes).sort()).toEqual([
      'attribute-of',
      'entity-relationship',
      'isa-link',
    ])
    for (const k of Object.keys(chenEdgeTypes)) {
      const entry = chenEdgeTypes[k as keyof typeof chenEdgeTypes]
      expect(entry).toBeTruthy()
      expect(['object', 'function']).toContain(typeof entry)
    }
  })
})
