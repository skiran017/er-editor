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

  it('does not dispatch the DELETE binding while focus is in an <input> (Bug 2 regression)', () => {
    // Backspace in the property panel input used to delete the selected node
    // because the Delete/Backspace binding uses `when: 'hasSelection'`, which
    // did not get the text-field filter. Now all non-'always' bindings skip
    // text fields.
    const input = document.createElement('input')
    document.body.appendChild(input)
    Object.defineProperty(document, 'activeElement', { value: input, configurable: true })
    renderHook(() => useKeyboard())
    fireKey({ key: 'Backspace' })
    fireKey({ key: 'Delete' })
    expect(sendSpy).not.toHaveBeenCalled()
    document.body.removeChild(input)
    Object.defineProperty(document, 'activeElement', { value: document.body, configurable: true })
  })

  it('does not fire Delete when focus is in a contentEditable element', () => {
    const div = document.createElement('div')
    div.setAttribute('contenteditable', 'true')
    // jsdom may not compute `isContentEditable` from the attribute; force it.
    Object.defineProperty(div, 'isContentEditable', { value: true, configurable: true })
    document.body.appendChild(div)
    Object.defineProperty(document, 'activeElement', { value: div, configurable: true })
    renderHook(() => useKeyboard())
    fireKey({ key: 'Backspace' })
    expect(sendSpy).not.toHaveBeenCalled()
    document.body.removeChild(div)
    Object.defineProperty(document, 'activeElement', { value: document.body, configurable: true })
  })

  it("still fires 'always' bindings (Escape) even while focus is in a text field", () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    Object.defineProperty(document, 'activeElement', { value: input, configurable: true })
    renderHook(() => useKeyboard())
    fireKey({ key: 'Escape' })
    expect(sendSpy).toHaveBeenCalledWith({ type: 'ESCAPE' })
    document.body.removeChild(input)
    Object.defineProperty(document, 'activeElement', { value: document.body, configurable: true })
  })
})
