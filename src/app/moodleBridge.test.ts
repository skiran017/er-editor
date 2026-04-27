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

describe('installMoodleBridge — origin resolution', () => {
  let postMessageSpy: ReturnType<typeof vi.fn>
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    postMessageSpy = vi.fn()
    Object.defineProperty(window, 'parent', {
      value: { postMessage: postMessageSpy },
      configurable: true,
    })
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
    Object.defineProperty(window, 'document', {
      value: { ...document, referrer: '' },
      configurable: true,
    })
  })

  it.each([
    // [search, referrer, expected target]
    ['?embed=true&parentOrigin=https%3A%2F%2Fmoodle.example', '',                          'https://moodle.example'],
    ['?embed=true',                                          'https://moodle.example/x',  'https://moodle.example'],
    ['?embed=true',                                          '',                          '*'],
    ['?embed=true&parentOrigin=not-a-url',                   'https://moodle.example/x',  'https://moodle.example'],
  ])('search=%s referrer=%s → target=%s', (search, referrer, expected) => {
    window.history.replaceState({}, '', `/${search}`)
    Object.defineProperty(document, 'referrer', { value: referrer, configurable: true })
    const cleanup = installMoodleBridge()
    // The bridge sends `ready` on init; assert its targetOrigin matches.
    expect(postMessageSpy).toHaveBeenCalledTimes(1)
    expect(postMessageSpy.mock.calls[0][1]).toBe(expected)
    cleanup()
  })

  it('logs console.warn when origin falls back to wildcard', () => {
    window.history.replaceState({}, '', '/?embed=true')
    Object.defineProperty(document, 'referrer', { value: '', configurable: true })
    installMoodleBridge()
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('postMessage running with origin=*'),
    )
  })

  it('does NOT warn when origin is exact', () => {
    window.history.replaceState({}, '', '/?embed=true&parentOrigin=https%3A%2F%2Fmoodle.example')
    installMoodleBridge()
    expect(warnSpy).not.toHaveBeenCalled()
  })
})
