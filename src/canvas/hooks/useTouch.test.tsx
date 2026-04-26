import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { ReactFlowProvider } from '@xyflow/react'
import { useTouch } from './useTouch'
import { useInteractionStore } from '@/interaction/interactionStore'
import { useViewportStore } from '@/state/viewportStore'

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
  useViewportStore.setState({ zoom: 1, pan: { x: 0, y: 0 } })
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const makePointerEvent = (init: { clientX: number; clientY: number; pointerType?: string; pointerId?: number }) => ({
  clientX: init.clientX, clientY: init.clientY,
  pointerType: init.pointerType ?? 'touch',
  pointerId: init.pointerId ?? 1,
  shiftKey: false, ctrlKey: false, altKey: false, metaKey: false,
  preventDefault: vi.fn(),
}) as unknown as React.PointerEvent<HTMLElement>

describe('useTouch — single-finger gesture state machine', () => {
  it('quick tap (down + up under 500ms, no movement) dispatches NOTHING from useTouch', () => {
    // Quick taps on empty canvas are routed to RF\'s onPaneClick / onNodeClick
    // synthesised from the underlying click event — useTouch deliberately
    // does NOT fire CANVAS_POINTER_DOWN/UP for them.
    const { result } = renderHook(() => useTouch(), RF_OPTS)
    result.current.onPointerDown(makePointerEvent({ clientX: 10, clientY: 20 }))
    result.current.onPointerUp(makePointerEvent({ clientX: 10, clientY: 20 }))
    expect(sendSpy).not.toHaveBeenCalled()
  })

  it('long-press (500ms idle) seeds CANVAS_POINTER_DOWN, opening rubberband at the touch origin', () => {
    const { result } = renderHook(() => useTouch(), RF_OPTS)
    result.current.onPointerDown(makePointerEvent({ clientX: 30, clientY: 40 }))
    expect(sendSpy).not.toHaveBeenCalled()
    vi.advanceTimersByTime(500)
    expect(sendSpy).toHaveBeenCalledWith({
      type: 'CANVAS_POINTER_DOWN',
      point: { x: 30, y: 40 },
      modifiers: { shift: false, ctrl: false, alt: false, meta: false },
      button: 'left',
    })
  })

  it('after long-press, moves dispatch CANVAS_POINTER_MOVE (rubberband grows)', () => {
    const { result } = renderHook(() => useTouch(), RF_OPTS)
    result.current.onPointerDown(makePointerEvent({ clientX: 30, clientY: 40 }))
    vi.advanceTimersByTime(500)
    sendSpy.mockClear()
    result.current.onPointerMove(makePointerEvent({ clientX: 80, clientY: 90 }))
    expect(sendSpy).toHaveBeenCalledWith({
      type: 'CANVAS_POINTER_MOVE',
      point: { x: 80, y: 90 },
    })
  })

  it('after long-press, pointerup dispatches CANVAS_POINTER_UP (commits rubberband)', () => {
    const { result } = renderHook(() => useTouch(), RF_OPTS)
    result.current.onPointerDown(makePointerEvent({ clientX: 30, clientY: 40 }))
    vi.advanceTimersByTime(500)
    sendSpy.mockClear()
    result.current.onPointerUp(makePointerEvent({ clientX: 80, clientY: 90 }))
    expect(sendSpy).toHaveBeenCalledWith({
      type: 'CANVAS_POINTER_UP',
      point: { x: 80, y: 90 },
    })
  })

  it('drag before long-press fires (movement > 8px) cancels the timer and pans the viewport', () => {
    const { result } = renderHook(() => useTouch(), RF_OPTS)
    result.current.onPointerDown(makePointerEvent({ clientX: 50, clientY: 50 }))
    // First move crosses the pan threshold — commits to pan mode but does
    // not yet apply a pan delta (the pan position is captured on this move).
    result.current.onPointerMove(makePointerEvent({ clientX: 70, clientY: 50 }))
    // Subsequent move applies the delta to the viewport.
    result.current.onPointerMove(makePointerEvent({ clientX: 80, clientY: 60 }))
    // Now advance the clock past the long-press threshold — the timer must
    // have been cleared, otherwise this would dispatch a stray CANVAS_POINTER_DOWN.
    vi.advanceTimersByTime(1000)
    expect(sendSpy).not.toHaveBeenCalled()
    const pan = useViewportStore.getState().pan
    // Second move shifted (80-70, 60-50) = (10, 10) from the first sample.
    expect(pan).toEqual({ x: 10, y: 10 })
  })

  it('pan finishes silently on pointerup (no FSM event)', () => {
    const { result } = renderHook(() => useTouch(), RF_OPTS)
    result.current.onPointerDown(makePointerEvent({ clientX: 50, clientY: 50 }))
    result.current.onPointerMove(makePointerEvent({ clientX: 70, clientY: 50 }))
    result.current.onPointerMove(makePointerEvent({ clientX: 80, clientY: 60 }))
    sendSpy.mockClear()
    result.current.onPointerUp(makePointerEvent({ clientX: 80, clientY: 60 }))
    expect(sendSpy).not.toHaveBeenCalled()
  })

  it('mouse-type pointer events are ignored (delegated to useMouse)', () => {
    const { result } = renderHook(() => useTouch(), RF_OPTS)
    result.current.onPointerDown(makePointerEvent({ clientX: 0, clientY: 0, pointerType: 'mouse' }))
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
})

describe('useTouch — palm rejection', () => {
  it('drops touch pointerdown while a pen pointer is active', () => {
    const { result } = renderHook(() => useTouch(), RF_OPTS)
    result.current.onPointerDown(makePointerEvent({
      clientX: 0, clientY: 0, pointerType: 'pen', pointerId: 99,
    }))
    expect(sendSpy).not.toHaveBeenCalled()
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
    // Now a touch is accepted — but it enters 'pending' (no immediate dispatch).
    result.current.onPointerDown(makePointerEvent({
      clientX: 10, clientY: 20, pointerType: 'touch', pointerId: 1,
    }))
    expect(sendSpy).not.toHaveBeenCalled()
    // Long-press fires → CANVAS_POINTER_DOWN.
    vi.advanceTimersByTime(500)
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
    result.current.onPointerDown(makePointerEvent({
      clientX: 5, clientY: 5, pointerType: 'touch', pointerId: 1,
    }))
    vi.advanceTimersByTime(500)
    expect(sendSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'CANVAS_POINTER_DOWN',
    }))
  })

  it('touch pointercancel for an active rubberband fires CANVAS_POINTER_UP and clears state', () => {
    const { result } = renderHook(() => useTouch(), RF_OPTS)
    result.current.onPointerDown(makePointerEvent({
      clientX: 10, clientY: 20, pointerType: 'touch', pointerId: 7,
    }))
    vi.advanceTimersByTime(500) // long-press fires → rubberband mode
    sendSpy.mockClear()
    result.current.onPointerCancel(makePointerEvent({
      clientX: 30, clientY: 40, pointerType: 'touch', pointerId: 7,
    }))
    expect(sendSpy).toHaveBeenCalledWith({
      type: 'CANVAS_POINTER_UP',
      point: { x: 30, y: 40 },
    })
    // Subsequent touchdowns are accepted again.
    result.current.onPointerDown(makePointerEvent({
      clientX: 50, clientY: 60, pointerType: 'touch', pointerId: 8,
    }))
    vi.advanceTimersByTime(500)
    expect(sendSpy).toHaveBeenLastCalledWith(expect.objectContaining({
      type: 'CANVAS_POINTER_DOWN',
      point: { x: 50, y: 60 },
    }))
  })
})

describe('useTouch — two-finger gestures', () => {
  it('two-finger pinch (spread) dispatches WHEEL_ZOOM with positive delta', () => {
    const { result } = renderHook(() => useTouch(), RF_OPTS)
    result.current.onPointerDown(makePointerEvent({
      clientX: 100, clientY: 100, pointerType: 'touch', pointerId: 1,
    }))
    result.current.onPointerDown(makePointerEvent({
      clientX: 200, clientY: 100, pointerType: 'touch', pointerId: 2,
    }))
    sendSpy.mockClear()
    result.current.onPointerMove(makePointerEvent({
      clientX: 300, clientY: 100, pointerType: 'touch', pointerId: 2,
    }))
    const wheelCall = sendSpy.mock.calls.find(([ev]) => ev.type === 'WHEEL_ZOOM')
    expect(wheelCall).toBeDefined()
    expect(wheelCall![0].delta).toBeGreaterThan(0)
    expect(wheelCall![0].anchor).toEqual({ x: 200, y: 100 })
  })

  it('two-finger pinch (squeeze) dispatches WHEEL_ZOOM with negative delta', () => {
    const { result } = renderHook(() => useTouch(), RF_OPTS)
    result.current.onPointerDown(makePointerEvent({ clientX: 100, clientY: 100, pointerType: 'touch', pointerId: 1 }))
    result.current.onPointerDown(makePointerEvent({ clientX: 200, clientY: 100, pointerType: 'touch', pointerId: 2 }))
    sendSpy.mockClear()
    result.current.onPointerMove(makePointerEvent({
      clientX: 150, clientY: 100, pointerType: 'touch', pointerId: 2,
    }))
    const wheelCall = sendSpy.mock.calls.find(([ev]) => ev.type === 'WHEEL_ZOOM')
    expect(wheelCall).toBeDefined()
    expect(wheelCall![0].delta).toBeLessThan(0)
  })

  it('two-finger drag with constant distance pans the viewport (no WHEEL_ZOOM)', () => {
    const { result } = renderHook(() => useTouch(), RF_OPTS)
    useViewportStore.setState({ zoom: 1, pan: { x: 0, y: 0 } })
    result.current.onPointerDown(makePointerEvent({ clientX: 100, clientY: 100, pointerType: 'touch', pointerId: 1 }))
    result.current.onPointerDown(makePointerEvent({ clientX: 200, clientY: 100, pointerType: 'touch', pointerId: 2 }))
    sendSpy.mockClear()
    // Both fingers move +50 px DOWN — perpendicular to the pinch axis keeps
    // |distChange| < midShift, so each event is correctly classified as pan.
    result.current.onPointerMove(makePointerEvent({ clientX: 100, clientY: 150, pointerType: 'touch', pointerId: 1 }))
    result.current.onPointerMove(makePointerEvent({ clientX: 200, clientY: 150, pointerType: 'touch', pointerId: 2 }))
    expect(sendSpy.mock.calls.find(([ev]) => ev.type === 'WHEEL_ZOOM')).toBeUndefined()
    const pan = useViewportStore.getState().pan
    expect(pan.x).toBe(0)
    expect(pan.y).toBeGreaterThan(0)
  })

  it('CANVAS_POINTER_MOVE is suppressed for finger 1 while a second finger is down', () => {
    const { result } = renderHook(() => useTouch(), RF_OPTS)
    result.current.onPointerDown(makePointerEvent({ clientX: 100, clientY: 100, pointerType: 'touch', pointerId: 1 }))
    result.current.onPointerDown(makePointerEvent({ clientX: 200, clientY: 100, pointerType: 'touch', pointerId: 2 }))
    sendSpy.mockClear()
    result.current.onPointerMove(makePointerEvent({
      clientX: 110, clientY: 100, pointerType: 'touch', pointerId: 1,
    }))
    expect(sendSpy.mock.calls.find(([ev]) => ev.type === 'CANVAS_POINTER_MOVE')).toBeUndefined()
  })

  it('a second finger landing during an in-progress rubberband cancels it cleanly', () => {
    const { result } = renderHook(() => useTouch(), RF_OPTS)
    result.current.onPointerDown(makePointerEvent({ clientX: 50, clientY: 50, pointerType: 'touch', pointerId: 1 }))
    vi.advanceTimersByTime(500) // rubberband mode
    sendSpy.mockClear()
    // Second finger arrives — rubberband must close out before we switch to gesture mode.
    result.current.onPointerDown(makePointerEvent({ clientX: 200, clientY: 100, pointerType: 'touch', pointerId: 2 }))
    expect(sendSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'CANVAS_POINTER_UP',
    }))
  })
})
