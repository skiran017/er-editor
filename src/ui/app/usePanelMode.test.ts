import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePanelMode } from './usePanelMode'

interface FakeMql {
  matches: boolean
  listeners: ((e: { matches: boolean }) => void)[]
  media: string
  addEventListener: (type: 'change', cb: (e: { matches: boolean }) => void) => void
  removeEventListener: (type: 'change', cb: (e: { matches: boolean }) => void) => void
}

const fakes = new Map<string, FakeMql>()
const fakeMatchMedia = (query: string): FakeMql => {
  let m = fakes.get(query)
  if (!m) {
    m = {
      matches: false, listeners: [], media: query,
      addEventListener: (_t, cb) => { m!.listeners.push(cb) },
      removeEventListener: (_t, cb) => {
        m!.listeners = m!.listeners.filter((l) => l !== cb)
      },
    }
    fakes.set(query, m)
  }
  return m
}
const setMatches = (query: string, v: boolean) => {
  const m = fakes.get(query)!
  m.matches = v
  for (const l of m.listeners) l({ matches: v })
}

beforeEach(() => {
  fakes.clear()
  vi.stubGlobal('matchMedia', fakeMatchMedia)
})
afterEach(() => { vi.unstubAllGlobals() })

describe('usePanelMode', () => {
  it("returns 'mobile' when viewport < 640px (sm not matched)", () => {
    fakeMatchMedia('(min-width: 640px)').matches = false
    fakeMatchMedia('(min-width: 1024px)').matches = false
    const { result } = renderHook(() => usePanelMode())
    expect(result.current).toBe('mobile')
  })

  it("returns 'tablet' when sm matches but lg does not (640-1023px)", () => {
    fakeMatchMedia('(min-width: 640px)').matches = true
    fakeMatchMedia('(min-width: 1024px)').matches = false
    const { result } = renderHook(() => usePanelMode())
    expect(result.current).toBe('tablet')
  })

  it("returns 'desktop' when lg matches (1024px+)", () => {
    fakeMatchMedia('(min-width: 640px)').matches = true
    fakeMatchMedia('(min-width: 1024px)').matches = true
    const { result } = renderHook(() => usePanelMode())
    expect(result.current).toBe('desktop')
  })

  it('updates when the viewport crosses a threshold', () => {
    fakeMatchMedia('(min-width: 640px)').matches = false
    fakeMatchMedia('(min-width: 1024px)').matches = false
    const { result } = renderHook(() => usePanelMode())
    expect(result.current).toBe('mobile')
    act(() => { setMatches('(min-width: 640px)', true) })
    expect(result.current).toBe('tablet')
    act(() => { setMatches('(min-width: 1024px)', true) })
    expect(result.current).toBe('desktop')
  })
})
