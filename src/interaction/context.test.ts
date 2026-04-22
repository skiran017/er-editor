import { describe, it, expect } from 'vitest'
import { initialContext } from './context'

describe('initialContext', () => {
  it('starts with select tool and all transient fields null', () => {
    expect(initialContext.tool).toBe('select')
    expect(initialContext.draggedNodeId).toBeNull()
    expect(initialContext.dragOriginPoint).toBeNull()
    expect(initialContext.connectionFromId).toBeNull()
    expect(initialContext.quickFirstId).toBeNull()
    expect(initialContext.resizeNodeId).toBeNull()
    expect(initialContext.resizeHandle).toBeNull()
  })

  it('is frozen', () => {
    expect(Object.isFrozen(initialContext)).toBe(true)
  })
})
