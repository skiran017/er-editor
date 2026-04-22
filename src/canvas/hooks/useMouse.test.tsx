import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useMouse } from './useMouse'
import { useInteractionStore } from '@/interaction/interactionStore'

let sendSpy: ReturnType<typeof vi.fn>

beforeEach(() => {
  sendSpy = vi.fn()
  vi.spyOn(useInteractionStore, 'getState').mockReturnValue({
    snapshot: useInteractionStore.getState().snapshot,
    send: sendSpy,
  })
})
afterEach(() => { vi.restoreAllMocks() })

describe('useMouse', () => {
  it('onPointerDown (left) → CANVAS_POINTER_DOWN with button=left', () => {
    const { result } = renderHook(() => useMouse())
    const mkEvent = (init: Partial<PointerEvent> = {}) => ({
      clientX: 10, clientY: 20,
      button: 0, shiftKey: false, ctrlKey: false, altKey: false, metaKey: false,
      pointerType: 'mouse',
      preventDefault: vi.fn(),
      ...init,
    }) as unknown as React.PointerEvent<HTMLElement>
    result.current.onPointerDown(mkEvent())
    expect(sendSpy).toHaveBeenCalledWith({
      type: 'CANVAS_POINTER_DOWN',
      point: { x: 10, y: 20 },
      modifiers: { shift: false, ctrl: false, alt: false, meta: false },
      button: 'left',
    })
  })

  it('middle-button → button=middle', () => {
    const { result } = renderHook(() => useMouse())
    result.current.onPointerDown({
      clientX: 0, clientY: 0, button: 1,
      shiftKey: false, ctrlKey: false, altKey: false, metaKey: false,
      pointerType: 'mouse',
      preventDefault: vi.fn(),
    } as unknown as React.PointerEvent<HTMLElement>)
    expect(sendSpy).toHaveBeenCalledWith(expect.objectContaining({ button: 'middle' }))
  })

  it('right-button → button=right', () => {
    const { result } = renderHook(() => useMouse())
    result.current.onPointerDown({
      clientX: 0, clientY: 0, button: 2,
      shiftKey: false, ctrlKey: false, altKey: false, metaKey: false,
      pointerType: 'mouse',
      preventDefault: vi.fn(),
    } as unknown as React.PointerEvent<HTMLElement>)
    expect(sendSpy).toHaveBeenCalledWith(expect.objectContaining({ button: 'right' }))
  })

  it('onPointerMove → CANVAS_POINTER_MOVE', () => {
    const { result } = renderHook(() => useMouse())
    result.current.onPointerMove({
      clientX: 33, clientY: 44, preventDefault: vi.fn(),
    } as unknown as React.PointerEvent<HTMLElement>)
    expect(sendSpy).toHaveBeenCalledWith({
      type: 'CANVAS_POINTER_MOVE',
      point: { x: 33, y: 44 },
    })
  })

  it('onPointerUp → CANVAS_POINTER_UP', () => {
    const { result } = renderHook(() => useMouse())
    result.current.onPointerUp({
      clientX: 55, clientY: 66, preventDefault: vi.fn(),
    } as unknown as React.PointerEvent<HTMLElement>)
    expect(sendSpy).toHaveBeenCalledWith({
      type: 'CANVAS_POINTER_UP',
      point: { x: 55, y: 66 },
    })
  })

})

describe('useMouse — wheel', () => {
  it('onWheel with ctrl pressed → WHEEL_ZOOM', () => {
    const { result } = renderHook(() => useMouse())
    result.current.onWheel({
      clientX: 100, clientY: 50, deltaY: -100,
      shiftKey: false, ctrlKey: true, altKey: false, metaKey: false,
      preventDefault: vi.fn(),
    } as unknown as React.WheelEvent<HTMLElement>)
    expect(sendSpy).toHaveBeenCalledWith({
      type: 'WHEEL_ZOOM',
      anchor: { x: 100, y: 50 },
      delta: expect.any(Number),
    })
  })

  it('touch-type pointer events are ignored (delegated to useTouch)', () => {
    const { result } = renderHook(() => useMouse())
    result.current.onPointerDown({
      clientX: 0, clientY: 0, button: 0,
      shiftKey: false, ctrlKey: false, altKey: false, metaKey: false,
      pointerType: 'touch',
      preventDefault: vi.fn(),
    } as unknown as React.PointerEvent<HTMLElement>)
    expect(sendSpy).not.toHaveBeenCalled()
  })

  it('touch-type pointer move and up are ignored', () => {
    const { result } = renderHook(() => useMouse())
    const touchMove = {
      clientX: 0, clientY: 0, pointerType: 'touch', preventDefault: vi.fn(),
    } as unknown as React.PointerEvent<HTMLElement>
    const touchUp = {
      clientX: 0, clientY: 0, pointerType: 'touch', preventDefault: vi.fn(),
    } as unknown as React.PointerEvent<HTMLElement>
    result.current.onPointerMove(touchMove)
    result.current.onPointerUp(touchUp)
    expect(sendSpy).not.toHaveBeenCalled()
  })

  it('plain wheel (no ctrl/meta) is ignored — reserved for native scroll', () => {
    const { result } = renderHook(() => useMouse())
    result.current.onWheel({
      clientX: 0, clientY: 0, deltaY: -100,
      shiftKey: false, ctrlKey: false, altKey: false, metaKey: false,
      preventDefault: vi.fn(),
    } as unknown as React.WheelEvent<HTMLElement>)
    expect(sendSpy).not.toHaveBeenCalled()
  })

  it('wheel with meta (Mac) also triggers WHEEL_ZOOM', () => {
    const { result } = renderHook(() => useMouse())
    result.current.onWheel({
      clientX: 0, clientY: 0, deltaY: 100,
      shiftKey: false, ctrlKey: false, altKey: false, metaKey: true,
      preventDefault: vi.fn(),
    } as unknown as React.WheelEvent<HTMLElement>)
    expect(sendSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'WHEEL_ZOOM' }))
  })
})
