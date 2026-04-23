import { describe, it, expect } from 'vitest'
import { chenToolbar } from './toolbar'

describe('chenToolbar', () => {
  it('has a select group containing select + pan tools', () => {
    const g = chenToolbar.groups.find((x) => x.id === 'select')
    expect(g).toBeDefined()
    expect(g!.tools).toEqual(expect.arrayContaining(['select', 'pan']))
  })

  it('has an elements group containing entity/relationship/attribute (isa surfaces through the quick-generalization flows instead)', () => {
    const g = chenToolbar.groups.find((x) => x.id === 'elements')
    expect(g).toBeDefined()
    expect(g!.tools).toEqual(
      expect.arrayContaining(['entity', 'relationship', 'attribute']),
    )
    expect(g!.tools).not.toContain('isa')
  })

  it('has a connections group containing connect + quick variants (three relationship modes, partial + total ISA)', () => {
    const g = chenToolbar.groups.find((x) => x.id === 'connections')
    expect(g).toBeDefined()
    expect(g!.tools).toEqual(
      expect.arrayContaining([
        'connect',
        'quickRelationship11',
        'quickRelationship1N',
        'quickRelationshipNN',
        'quickGeneralization',
        'quickGeneralizationTotal',
      ]),
    )
  })

  it('every group has a non-empty labelKey', () => {
    for (const g of chenToolbar.groups) expect(g.labelKey).toMatch(/./)
  })
})
