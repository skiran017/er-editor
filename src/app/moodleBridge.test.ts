import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { installMoodleBridge } from './moodleBridge'

const setSearch = (search: string) => {
  // jsdom: replace the URL so URLSearchParams sees the test value.
  window.history.replaceState({}, '', `/${search}`)
}

describe('installMoodleBridge — activation gate', () => {
  let originalParent: Window
  let addSpy: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    originalParent = window.parent
    addSpy = vi.spyOn(window, 'addEventListener')
  })
  afterEach(() => {
    addSpy.mockRestore()
    Object.defineProperty(window, 'parent', { value: originalParent, configurable: true })
    setSearch('')
  })

  it('installs no listeners when ?embed is missing', () => {
    setSearch('')
    const cleanup = installMoodleBridge()
    expect(addSpy).not.toHaveBeenCalledWith('message', expect.anything())
    cleanup()
  })

  it('installs no listeners when window === window.parent (not iframed)', () => {
    setSearch('?embed=true')
    Object.defineProperty(window, 'parent', { value: window, configurable: true })
    const cleanup = installMoodleBridge()
    expect(addSpy).not.toHaveBeenCalledWith('message', expect.anything())
    cleanup()
  })

  it('installs message + pagehide + beforeunload listeners when embedded', () => {
    setSearch('?embed=true')
    Object.defineProperty(window, 'parent', { value: { postMessage: vi.fn() }, configurable: true })
    const cleanup = installMoodleBridge()
    const events = addSpy.mock.calls.map((c) => c[0])
    expect(events).toContain('message')
    expect(events).toContain('pagehide')
    expect(events).toContain('beforeunload')
    cleanup()
  })
})
