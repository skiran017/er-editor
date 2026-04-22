import { describe, it, expect } from 'vitest'
import { chenPlugin } from './index'
import { emptyDiagram } from '@/domain/types'

describe('chenPlugin', () => {
  it('has id="chen" and a non-empty label', () => {
    expect(chenPlugin.id).toBe('chen')
    expect(chenPlugin.label).toMatch(/./)
  })

  it('exposes default sizes matching spec §5.7', () => {
    expect(chenPlugin.defaults.entitySize).toEqual({ width: 120, height: 60 })
    expect(chenPlugin.defaults.relationshipSize).toEqual({ width: 140, height: 70 })
    expect(chenPlugin.defaults.attributeSize).toEqual({ width: 90, height: 50 })
    expect(chenPlugin.defaults.isaSize).toEqual({ width: 100, height: 60 })
    expect(chenPlugin.defaults.edgeType).toBe('smoothstep')
  })

  it('validate returns an empty dict for an empty diagram', () => {
    const out = chenPlugin.validate(emptyDiagram())
    expect(Object.keys(out)).toHaveLength(0)
  })

  it('validate is a function', () => {
    expect(chenPlugin.validate).toBeTypeOf('function')
  })

  it('chen plugin nodeTypes / edgeTypes are empty placeholders at the notation layer', () => {
    expect(Object.keys(chenPlugin.nodeTypes)).toHaveLength(0)
    expect(Object.keys(chenPlugin.edgeTypes)).toHaveLength(0)
  })

  it('nativeJson codec is declared (parse/serialize filled in Phase 5)', () => {
    expect(chenPlugin.codecs.nativeJson.id).toBe('chen-native-json')
    expect(chenPlugin.codecs.nativeJson.role).toBe('import-export')
  })

  it('uses chenToolbar', () => {
    expect(chenPlugin.tools.groups.map((g) => g.id)).toEqual([
      'select',
      'elements',
      'connections',
    ])
  })
})
