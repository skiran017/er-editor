import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { ReactFlowProvider } from '@xyflow/react'
import { useTouch } from './useTouch'
import { useInteractionStore } from '@/interaction/interactionStore'

// useTouch calls useReactFlow(); with no <ReactFlow> mounted,
// screenToFlowPosition is identity, so existing assertions still hold.
const RF_OPTS = { wrapper: ReactFlowProvider } as const

let sendSpy: ReturnType<typeof vi.fn>

beforeEach(() => {
  sendSpy = vi.fn()
  vi.spyOn(useInteractionStore, 'getState').mockReturnValue({
    snapshot: useInteractionStore.getState().snapshot,
    send: sendSpy,
  })
})
afterEach(() => { vi.restoreAllMocks() })

const makePointerEvent = (init: { clientX: number; clientY: number; pointerType?: string; pointerId?: number }) => ({
  clientX: init.clientX, clientY: init.clientY,
  pointerType: init.pointerType ?? 'touch',
  pointerId: init.pointerId ?? 1,
  shiftKey: false, ctrlKey: false, altKey: false, metaKey: false,
  preventDefault: vi.fn(),
}) as unknown as React.PointerEvent<HTMLElement>

describe('useTouch', () => {
  it('single touch pointer-down → CANVAS_POINTER_DOWN button=left', () => {
    const { result } = renderHook(() => useTouch(), RF_OPTS)
    result.current.onPointerDown(makePointerEvent({ clientX: 10, clientY: 20 }))
    expect(sendSpy).toHaveBeenCalledWith({
      type: 'CANVAS_POINTER_DOWN',
      point: { x: 10, y: 20 },
      modifiers: { shift: false, ctrl: false, alt: false, meta: false },
      button: 'left',
    })
  })

  it('single touch move → CANVAS_POINTER_MOVE', () => {
    const { result } = renderHook(() => useTouch(), RF_OPTS)
    result.current.onPointerDown(makePointerEvent({ clientX: 0, clientY: 0 }))
    result.current.onPointerMove(makePointerEvent({ clientX: 20, clientY: 30 }))
    expect(sendSpy).toHaveBeenLastCalledWith({
      type: 'CANVAS_POINTER_MOVE',
      point: { x: 20, y: 30 },
    })
  })

  it('single touch up → CANVAS_POINTER_UP', () => {
    const { result } = renderHook(() => useTouch(), RF_OPTS)
    result.current.onPointerDown(makePointerEvent({ clientX: 0, clientY: 0 }))
    result.current.onPointerUp(makePointerEvent({ clientX: 0, clientY: 0 }))
    expect(sendSpy).toHaveBeenLastCalledWith({
      type: 'CANVAS_POINTER_UP',
      point: { x: 0, y: 0 },
    })
  })

  it('mouse-type pointer events are ignored (delegated to useMouse)', () => {
    const { result } = renderHook(() => useTouch(), RF_OPTS)
    result.current.onPointerDown(makePointerEvent({ clientX: 0, clientY: 0, pointerType: 'mouse' }))
    expect(sendSpy).not.toHaveBeenCalled()
  })

  it('second concurrent touch pointer-down is ignored (pinch/gesture = Sub-project 4)', () => {
    const { result } = renderHook(() => useTouch(), RF_OPTS)
    result.current.onPointerDown(makePointerEvent({ clientX: 0, clientY: 0, pointerId: 1 }))
    sendSpy.mockClear()
    result.current.onPointerDown(makePointerEvent({ clientX: 100, clientY: 100, pointerId: 2 }))
    expect(sendSpy).not.toHaveBeenCalled()
  })

  it('mouse-type pointer move and up are ignored', () => {
    const { result } = renderHook(() => useTouch(), RF_OPTS)
    result.current.onPointerMove(makePointerEvent({ clientX: 0, clientY: 0, pointerType: 'mouse' }))
    result.current.onPointerUp(makePointerEvent({ clientX: 0, clientY: 0, pointerType: 'mouse' }))
    expect(sendSpy).not.toHaveBeenCalled()
  })

  it('touch move/up with a different pointerId than the active one are ignored', () => {
    const { result } = renderHook(() => useTouch(), RF_OPTS)
    result.current.onPointerDown(makePointerEvent({ clientX: 0, clientY: 0, pointerId: 1 }))
    sendSpy.mockClear()
    result.current.onPointerMove(makePointerEvent({ clientX: 50, clientY: 50, pointerId: 2 }))
    result.current.onPointerUp(makePointerEvent({ clientX: 50, clientY: 50, pointerId: 2 }))
    expect(sendSpy).not.toHaveBeenCalled()
  })

  it('drops touch pointerdown while a pen pointer is active (palm rejection)', () => {
    const { result } = renderHook(() => useTouch(), RF_OPTS)
    // 1. Pen pointer goes down — should NOT dispatch (useTouch only handles touch)
    //    but MUST set the internal pen-active flag.
    result.current.onPointerDown(makePointerEvent({
      clientX: 0, clientY: 0, pointerType: 'pen', pointerId: 99,
    }))
    expect(sendSpy).not.toHaveBeenCalled()
    // 2. Concurrent touch pointer (palm) — must be ignored while pen is active.
    result.current.onPointerDown(makePointerEvent({
      clientX: 50, clientY: 50, pointerType: 'touch', pointerId: 100,
    }))
    expect(sendSpy).not.toHaveBeenCalled()
  })

  it('clears the pen-active flag on pen pointerup so subsequent touches are accepted', () => {
    const { result } = renderHook(() => useTouch(), RF_OPTS)
    result.current.onPointerDown(makePointerEvent({
      clientX: 0, clientY: 0, pointerType: 'pen', pointerId: 99,
    }))
    result.current.onPointerUp(makePointerEvent({
      clientX: 0, clientY: 0, pointerType: 'pen', pointerId: 99,
    }))
    // Now a touch should go through.
    result.current.onPointerDown(makePointerEvent({
      clientX: 10, clientY: 20, pointerType: 'touch', pointerId: 1,
    }))
    expect(sendSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'CANVAS_POINTER_DOWN',
    }))
  })
})
