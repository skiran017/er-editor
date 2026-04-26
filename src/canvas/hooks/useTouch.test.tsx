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

  it('pen pointercancel clears the pen-active flag (recovery for lost pointer capture)', () => {
    const { result } = renderHook(() => useTouch(), RF_OPTS)
    result.current.onPointerDown(makePointerEvent({
      clientX: 0, clientY: 0, pointerType: 'pen', pointerId: 99,
    }))
    result.current.onPointerCancel(makePointerEvent({
      clientX: 0, clientY: 0, pointerType: 'pen', pointerId: 99,
    }))
    // After the cancel, a touch must be accepted again.
    result.current.onPointerDown(makePointerEvent({
      clientX: 5, clientY: 5, pointerType: 'touch', pointerId: 1,
    }))
    expect(sendSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'CANVAS_POINTER_DOWN',
    }))
  })

  it('touch pointercancel for the active touch dispatches CANVAS_POINTER_UP and clears the active pointer', () => {
    const { result } = renderHook(() => useTouch(), RF_OPTS)
    result.current.onPointerDown(makePointerEvent({
      clientX: 10, clientY: 20, pointerType: 'touch', pointerId: 7,
    }))
    sendSpy.mockClear()
    result.current.onPointerCancel(makePointerEvent({
      clientX: 30, clientY: 40, pointerType: 'touch', pointerId: 7,
    }))
    expect(sendSpy).toHaveBeenCalledWith({
      type: 'CANVAS_POINTER_UP',
      point: { x: 30, y: 40 },
    })
    // A subsequent touchdown should now be accepted (not blocked by the stale activePointerId).
    result.current.onPointerDown(makePointerEvent({
      clientX: 50, clientY: 60, pointerType: 'touch', pointerId: 8,
    }))
    expect(sendSpy).toHaveBeenLastCalledWith(expect.objectContaining({
      type: 'CANVAS_POINTER_DOWN',
      point: { x: 50, y: 60 },
    }))
  })

  it('two-finger pinch (second touch + spread move) dispatches WHEEL_ZOOM with positive delta', () => {
    const { result } = renderHook(() => useTouch(), RF_OPTS)
    // Finger 1 at (100, 100)
    result.current.onPointerDown(makePointerEvent({
      clientX: 100, clientY: 100, pointerType: 'touch', pointerId: 1,
    }))
    // Finger 2 at (200, 100) — initial distance = 100
    result.current.onPointerDown(makePointerEvent({
      clientX: 200, clientY: 100, pointerType: 'touch', pointerId: 2,
    }))
    // Clear the spy to focus on what happens during the pinch move.
    sendSpy.mockClear()
    // Move finger 2 to (300, 100) — new distance 200, midpoint (200, 100).
    result.current.onPointerMove(makePointerEvent({
      clientX: 300, clientY: 100, pointerType: 'touch', pointerId: 2,
    }))
    // Expect a WHEEL_ZOOM with positive delta (spread = zoom in).
    const wheelCall = sendSpy.mock.calls.find(([ev]) => ev.type === 'WHEEL_ZOOM')
    expect(wheelCall).toBeDefined()
    const ev = wheelCall![0]
    expect(ev.delta).toBeGreaterThan(0)
    expect(ev.anchor).toEqual({ x: 200, y: 100 })
  })

  it('two-finger pinch (pinch in) dispatches WHEEL_ZOOM with negative delta', () => {
    const { result } = renderHook(() => useTouch(), RF_OPTS)
    result.current.onPointerDown(makePointerEvent({ clientX: 100, clientY: 100, pointerType: 'touch', pointerId: 1 }))
    result.current.onPointerDown(makePointerEvent({ clientX: 200, clientY: 100, pointerType: 'touch', pointerId: 2 }))
    sendSpy.mockClear()
    // Move finger 2 to (150, 100) — new distance 50, midpoint (125, 100). Distance shrank → negative delta.
    result.current.onPointerMove(makePointerEvent({
      clientX: 150, clientY: 100, pointerType: 'touch', pointerId: 2,
    }))
    const wheelCall = sendSpy.mock.calls.find(([ev]) => ev.type === 'WHEEL_ZOOM')
    expect(wheelCall).toBeDefined()
    expect(wheelCall![0].delta).toBeLessThan(0)
  })

  it('CANVAS_POINTER_MOVE is suppressed for finger 1 while a second finger is down', () => {
    const { result } = renderHook(() => useTouch(), RF_OPTS)
    result.current.onPointerDown(makePointerEvent({ clientX: 100, clientY: 100, pointerType: 'touch', pointerId: 1 }))
    result.current.onPointerDown(makePointerEvent({ clientX: 200, clientY: 100, pointerType: 'touch', pointerId: 2 }))
    sendSpy.mockClear()
    // Finger 1 moves while pinching.
    result.current.onPointerMove(makePointerEvent({
      clientX: 110, clientY: 100, pointerType: 'touch', pointerId: 1,
    }))
    // No CANVAS_POINTER_MOVE should fire — only WHEEL_ZOOM.
    const moveCall = sendSpy.mock.calls.find(([ev]) => ev.type === 'CANVAS_POINTER_MOVE')
    expect(moveCall).toBeUndefined()
  })

  it('lifting the second finger restores single-finger behaviour', () => {
    const { result } = renderHook(() => useTouch(), RF_OPTS)
    result.current.onPointerDown(makePointerEvent({ clientX: 100, clientY: 100, pointerType: 'touch', pointerId: 1 }))
    result.current.onPointerDown(makePointerEvent({ clientX: 200, clientY: 100, pointerType: 'touch', pointerId: 2 }))
    result.current.onPointerUp(makePointerEvent({ clientX: 200, clientY: 100, pointerType: 'touch', pointerId: 2 }))
    sendSpy.mockClear()
    // Finger 1 still down — moves should now resume firing CANVAS_POINTER_MOVE.
    result.current.onPointerMove(makePointerEvent({
      clientX: 120, clientY: 110, pointerType: 'touch', pointerId: 1,
    }))
    expect(sendSpy).toHaveBeenCalledWith({
      type: 'CANVAS_POINTER_MOVE',
      point: { x: 120, y: 110 },
    })
  })
})
