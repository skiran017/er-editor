import { describe, it, expect } from 'vitest'
import { chenToolbar } from './toolbar'

describe('chenToolbar', () => {
  it('has a select group containing select + pan tools', () => {
    const g = chenToolbar.groups.find((x) => x.id === 'select')
    expect(g).toBeDefined()
    expect(g!.tools).toEqual(expect.arrayContaining(['select', 'pan']))
  })

  it('has an elements group containing all four element tools', () => {
    const g = chenToolbar.groups.find((x) => x.id === 'elements')
    expect(g).toBeDefined()
    expect(g!.tools).toEqual(
      expect.arrayContaining(['entity', 'relationship', 'attribute', 'isa']),
    )
  })

  it('has a connections group containing connect + quick variants', () => {
    const g = chenToolbar.groups.find((x) => x.id === 'connections')
    expect(g).toBeDefined()
    expect(g!.tools).toEqual(
      expect.arrayContaining(['connect', 'quickRelationship', 'quickGeneralization']),
    )
  })

  it('every group has a non-empty labelKey', () => {
    for (const g of chenToolbar.groups) expect(g.labelKey).toMatch(/./)
  })
})
