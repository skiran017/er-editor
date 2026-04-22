import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { debounce } from './debounce'

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

describe('debounce', () => {
  it('calls fn once after the wait when not re-triggered', () => {
    const fn = vi.fn()
    const d = debounce(fn, 100)
    d('a')
    vi.advanceTimersByTime(99)
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(fn).toHaveBeenCalledWith('a')
  })

  it('re-triggering within the window restarts the timer', () => {
    const fn = vi.fn()
    const d = debounce(fn, 100)
    d(1)
    vi.advanceTimersByTime(50)
    d(2)
    vi.advanceTimersByTime(99)
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(fn).toHaveBeenCalledExactlyOnceWith(2)
  })
})
