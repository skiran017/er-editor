import { describe, it, expect } from 'vitest'
import * as adapters from './index'

describe('canvas/adapters barrel', () => {
  it('re-exports diagramToRf and rfToDiagramPatch', () => {
    expect(typeof adapters.diagramToRf).toBe('function')
    expect(typeof adapters.rfToDiagramPatch).toBe('function')
  })
})
