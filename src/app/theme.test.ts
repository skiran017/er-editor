import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { installThemeSubscriber } from './theme'
import { useUiStore } from '@/state/uiStore'

const dark = () => document.documentElement.classList.contains('dark')

beforeEach(() => {
  document.documentElement.classList.remove('dark')
  useUiStore.setState({ theme: 'system' })
  // Default matchMedia mock: not dark
  vi.stubGlobal('matchMedia', vi.fn((q: string) => ({
    matches: false,
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })))
})

afterEach(() => { vi.unstubAllGlobals() })

describe('installThemeSubscriber', () => {
  it('applies the dark class when theme is "dark"', () => {
    useUiStore.setState({ theme: 'dark' })
    const cleanup = installThemeSubscriber()
    expect(dark()).toBe(true)
    cleanup()
  })

  it('removes the dark class when theme is "light"', () => {
    document.documentElement.classList.add('dark')
    useUiStore.setState({ theme: 'light' })
    const cleanup = installThemeSubscriber()
    expect(dark()).toBe(false)
    cleanup()
  })

  it('reacts to live theme changes after subscribe', () => {
    useUiStore.setState({ theme: 'light' })
    const cleanup = installThemeSubscriber()
    expect(dark()).toBe(false)

    useUiStore.setState({ theme: 'dark' })
    expect(dark()).toBe(true)

    cleanup()
  })

  it('system theme follows matchMedia', () => {
    vi.stubGlobal('matchMedia', vi.fn((q: string) => ({
      matches: true,  // OS prefers dark
      media: q,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })))
    useUiStore.setState({ theme: 'system' })
    const cleanup = installThemeSubscriber()
    expect(dark()).toBe(true)
    cleanup()
  })

  it('cleanup removes the matchMedia listener', () => {
    const removeEventListener = vi.fn()
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: false,
      media: '(prefers-color-scheme: dark)',
      addEventListener: vi.fn(),
      removeEventListener,
    })))
    const cleanup = installThemeSubscriber()
    cleanup()
    expect(removeEventListener).toHaveBeenCalled()
  })
})
