import { describe, it, expect, beforeEach } from 'vitest'
import { forceLightMode } from './forceLightMode'

beforeEach(() => {
  document.documentElement.classList.remove('dark')
})

describe('forceLightMode', () => {
  it('removes the dark class on call and restores it on release when it was set', () => {
    document.documentElement.classList.add('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    const restore = forceLightMode()
    expect(document.documentElement.classList.contains('dark')).toBe(false)

    restore()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('is a no-op when dark was not set originally', () => {
    expect(document.documentElement.classList.contains('dark')).toBe(false)

    const restore = forceLightMode()
    expect(document.documentElement.classList.contains('dark')).toBe(false)

    restore()
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
