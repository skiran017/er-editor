import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { installMoodleBridge } from './moodleBridge'
import { useDiagramStore } from '@/state/diagramStore'
import { emptyDiagram } from '@/domain/types'

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
    const cleanup = installMoodleBridge()
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('postMessage running with origin=*'),
    )
    cleanup()
  })

  it('does NOT warn when origin is exact', () => {
    window.history.replaceState({}, '', '/?embed=true&parentOrigin=https%3A%2F%2Fmoodle.example')
    const cleanup = installMoodleBridge()
    expect(warnSpy).not.toHaveBeenCalled()
    cleanup()
  })
})

describe('installMoodleBridge — outgoing autosave / save', () => {
  let postMessageSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()
    postMessageSpy = vi.fn()
    Object.defineProperty(window, 'parent', {
      value: { postMessage: postMessageSpy },
      configurable: true,
    })
    window.history.replaceState({}, '', '/?embed=true&parentOrigin=https%3A%2F%2Fhost.test')
    useDiagramStore.setState({ diagram: emptyDiagram() })
    useDiagramStore.temporal.getState().clear()
  })

  afterEach(() => { vi.useRealTimers() })

  it('emits debounced autosave 800ms after a diagram change', () => {
    const cleanup = installMoodleBridge()
    postMessageSpy.mockClear()  // ignore the initial `ready`

    useDiagramStore.getState().addNode({
      kind: 'entity', name: 'E', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })

    vi.advanceTimersByTime(799)
    expect(postMessageSpy).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(postMessageSpy).toHaveBeenCalledTimes(1)
    const [payload, origin] = postMessageSpy.mock.calls[0]
    expect(origin).toBe('https://host.test')
    expect(payload.source).toBe('er-editor')
    expect(payload.type).toBe('autosave')
    expect(typeof payload.xml).toBe('string')
    expect(payload.xml.length).toBeGreaterThan(0)

    cleanup()
  })

  it('coalesces multiple changes within 800ms into one autosave', () => {
    const cleanup = installMoodleBridge()
    postMessageSpy.mockClear()

    useDiagramStore.getState().addNode({
      kind: 'entity', name: 'A', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    vi.advanceTimersByTime(400)
    useDiagramStore.getState().addNode({
      kind: 'entity', name: 'B', isWeak: false,
      position: { x: 200, y: 0 }, size: { width: 120, height: 60 },
    })
    vi.advanceTimersByTime(800)

    expect(postMessageSpy).toHaveBeenCalledTimes(1)
    expect(postMessageSpy.mock.calls[0][0].type).toBe('autosave')
    cleanup()
  })

  it('emits a save (not autosave) on pagehide and cancels the pending autosave', () => {
    const cleanup = installMoodleBridge()
    postMessageSpy.mockClear()

    useDiagramStore.getState().addNode({
      kind: 'entity', name: 'E', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    vi.advanceTimersByTime(100)
    window.dispatchEvent(new Event('pagehide'))

    expect(postMessageSpy).toHaveBeenCalledTimes(1)
    expect(postMessageSpy.mock.calls[0][0].type).toBe('save')

    // No follow-up autosave should fire.
    vi.advanceTimersByTime(1000)
    expect(postMessageSpy).toHaveBeenCalledTimes(1)
    cleanup()
  })
})
