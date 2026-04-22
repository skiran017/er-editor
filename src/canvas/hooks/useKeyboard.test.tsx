import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useKeyboard } from './useKeyboard'
import { useInteractionStore } from '@/interaction/interactionStore'

let sendSpy: ReturnType<typeof vi.fn>

beforeEach(() => {
  sendSpy = vi.fn()
  vi.spyOn(useInteractionStore, 'getState').mockReturnValue({
    snapshot: useInteractionStore.getState().snapshot,
    send: sendSpy,
  })
})
afterEach(() => {
  vi.restoreAllMocks()
})

const fireKey = (init: KeyboardEventInit) => {
  window.dispatchEvent(new KeyboardEvent('keydown', init))
}

describe('useKeyboard', () => {
  it('dispatches PICK_TOOL entity when E is pressed', () => {
    renderHook(() => useKeyboard())
    fireKey({ key: 'e' })
    expect(sendSpy).toHaveBeenCalledWith({ type: 'PICK_TOOL', tool: 'entity' })
  })

  it('dispatches UNDO on Cmd+Z', () => {
    renderHook(() => useKeyboard())
    fireKey({ key: 'z', metaKey: true })
    expect(sendSpy).toHaveBeenCalledWith({ type: 'UNDO' })
  })

  it('does not dispatch when focus is in an <input>', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    renderHook(() => useKeyboard())
    // Re-focus before dispatching (dispatch is global)
    Object.defineProperty(document, 'activeElement', { value: input, configurable: true })
    fireKey({ key: 'e' })
    expect(sendSpy).not.toHaveBeenCalled()
    document.body.removeChild(input)
  })

  it('unregisters the listener on unmount', () => {
    const { unmount } = renderHook(() => useKeyboard())
    unmount()
    fireKey({ key: 'e' })
    expect(sendSpy).not.toHaveBeenCalled()
  })

  it('ignores unbound keys (no matching keybinding)', () => {
    renderHook(() => useKeyboard())
    fireKey({ key: 'F12' })
    expect(sendSpy).not.toHaveBeenCalled()
  })

  it('does not dispatch when focus is in a <textarea>', () => {
    const ta = document.createElement('textarea')
    document.body.appendChild(ta)
    Object.defineProperty(document, 'activeElement', { value: ta, configurable: true })
    renderHook(() => useKeyboard())
    fireKey({ key: 'e' })
    expect(sendSpy).not.toHaveBeenCalled()
    document.body.removeChild(ta)
    Object.defineProperty(document, 'activeElement', { value: document.body, configurable: true })
  })
})
