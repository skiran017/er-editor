import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { ReactFlowProvider } from '@xyflow/react'
import { useMouse } from './useMouse'
import { useInteractionStore } from '@/interaction/interactionStore'

// useMouse calls useReactFlow() so it must be rendered inside a provider.
// With no <ReactFlow> mounted, screenToFlowPosition is identity — the raw
// clientX/clientY values are passed through unchanged, keeping existing
// test assertions valid.
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

describe('useMouse', () => {
  it('onPointerDown (left) → CANVAS_POINTER_DOWN with button=left', () => {
    const { result } = renderHook(() => useMouse(), RF_OPTS)
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
    const { result } = renderHook(() => useMouse(), RF_OPTS)
    result.current.onPointerDown({
      clientX: 0, clientY: 0, button: 1,
      shiftKey: false, ctrlKey: false, altKey: false, metaKey: false,
      pointerType: 'mouse',
      preventDefault: vi.fn(),
    } as unknown as React.PointerEvent<HTMLElement>)
    expect(sendSpy).toHaveBeenCalledWith(expect.objectContaining({ button: 'middle' }))
  })

  it('right-button → button=right', () => {
    const { result } = renderHook(() => useMouse(), RF_OPTS)
    result.current.onPointerDown({
      clientX: 0, clientY: 0, button: 2,
      shiftKey: false, ctrlKey: false, altKey: false, metaKey: false,
      pointerType: 'mouse',
      preventDefault: vi.fn(),
    } as unknown as React.PointerEvent<HTMLElement>)
    expect(sendSpy).toHaveBeenCalledWith(expect.objectContaining({ button: 'right' }))
  })

  it('onPointerMove → CANVAS_POINTER_MOVE', () => {
    const { result } = renderHook(() => useMouse(), RF_OPTS)
    result.current.onPointerMove({
      clientX: 33, clientY: 44, preventDefault: vi.fn(),
    } as unknown as React.PointerEvent<HTMLElement>)
    expect(sendSpy).toHaveBeenCalledWith({
      type: 'CANVAS_POINTER_MOVE',
      point: { x: 33, y: 44 },
    })
  })

  it('onPointerUp → CANVAS_POINTER_UP', () => {
    const { result } = renderHook(() => useMouse(), RF_OPTS)
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
    const { result } = renderHook(() => useMouse(), RF_OPTS)
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
    const { result } = renderHook(() => useMouse(), RF_OPTS)
    result.current.onPointerDown({
      clientX: 0, clientY: 0, button: 0,
      shiftKey: false, ctrlKey: false, altKey: false, metaKey: false,
      pointerType: 'touch',
      preventDefault: vi.fn(),
    } as unknown as React.PointerEvent<HTMLElement>)
    expect(sendSpy).not.toHaveBeenCalled()
  })

  it('touch-type pointer move and up are ignored', () => {
    const { result } = renderHook(() => useMouse(), RF_OPTS)
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
    const { result } = renderHook(() => useMouse(), RF_OPTS)
    result.current.onWheel({
      clientX: 0, clientY: 0, deltaY: -100,
      shiftKey: false, ctrlKey: false, altKey: false, metaKey: false,
      preventDefault: vi.fn(),
    } as unknown as React.WheelEvent<HTMLElement>)
    expect(sendSpy).not.toHaveBeenCalled()
  })

  it('wheel with meta (Mac) also triggers WHEEL_ZOOM', () => {
    const { result } = renderHook(() => useMouse(), RF_OPTS)
    result.current.onWheel({
      clientX: 0, clientY: 0, deltaY: 100,
      shiftKey: false, ctrlKey: false, altKey: false, metaKey: true,
      preventDefault: vi.fn(),
    } as unknown as React.WheelEvent<HTMLElement>)
    expect(sendSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'WHEEL_ZOOM' }))
  })

  it('clicks inside a React Flow panel (Controls / MiniMap) are ignored — clicking + or − in a placement tool must not create a node', () => {
    // Regression guard for the bug: in any placement tool the zoom/fit/
    // interactivity buttons were bubbling CANVAS_POINTER_* through the
    // wrapper and the FSM was happily placing a node at the button's coords.
    const { result } = renderHook(() => useMouse(), RF_OPTS)
    // Build a DOM tree that mirrors RF's markup so closest() resolves.
    const panel = document.createElement('div')
    panel.className = 'react-flow__panel react-flow__controls'
    const button = document.createElement('button')
    button.className = 'react-flow__controls-button'
    panel.appendChild(button)
    document.body.appendChild(panel)

    const evt = {
      clientX: 20, clientY: 30, button: 0,
      shiftKey: false, ctrlKey: false, altKey: false, metaKey: false,
      pointerType: 'mouse',
      target: button,
      preventDefault: vi.fn(),
    } as unknown as React.PointerEvent<HTMLElement>

    result.current.onPointerDown(evt)
    result.current.onPointerUp(evt)
    expect(sendSpy).not.toHaveBeenCalled()
    document.body.removeChild(panel)
  })

  it('clicks on the plain pane (no panel ancestor) still fire CANVAS_POINTER_DOWN', () => {
    const { result } = renderHook(() => useMouse(), RF_OPTS)
    const pane = document.createElement('div')
    pane.className = 'react-flow__pane'
    document.body.appendChild(pane)
    result.current.onPointerDown({
      clientX: 50, clientY: 60, button: 0,
      shiftKey: false, ctrlKey: false, altKey: false, metaKey: false,
      pointerType: 'mouse',
      target: pane,
      preventDefault: vi.fn(),
    } as unknown as React.PointerEvent<HTMLElement>)
    expect(sendSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'CANVAS_POINTER_DOWN' }))
    document.body.removeChild(pane)
  })

  it('pointerdown on a node target does NOT fire CANVAS_POINTER_DOWN (rubberband-during-drag fix)', () => {
    // RF v12 doesn't stop propagation on node-wrapper pointer events. Without
    // the node-target filter, clicking-and-dragging a node would dispatch
    // CANVAS_POINTER_DOWN (entering rubberBand) AND let RF native node-drag
    // run — the user sees a phantom rubberband under their cursor.
    const { result } = renderHook(() => useMouse(), RF_OPTS)
    const node = document.createElement('div')
    node.className = 'react-flow__node'
    const inner = document.createElement('span')
    node.appendChild(inner)
    document.body.appendChild(node)
    result.current.onPointerDown({
      clientX: 30, clientY: 40, button: 0,
      shiftKey: false, ctrlKey: false, altKey: false, metaKey: false,
      pointerType: 'mouse',
      target: inner,
      preventDefault: vi.fn(),
    } as unknown as React.PointerEvent<HTMLElement>)
    expect(sendSpy).not.toHaveBeenCalled()
    document.body.removeChild(node)
  })

  it('pointerdown on an edge target does NOT fire CANVAS_POINTER_DOWN', () => {
    const { result } = renderHook(() => useMouse(), RF_OPTS)
    const edge = document.createElement('div')
    edge.className = 'react-flow__edge'
    document.body.appendChild(edge)
    result.current.onPointerDown({
      clientX: 30, clientY: 40, button: 0,
      shiftKey: false, ctrlKey: false, altKey: false, metaKey: false,
      pointerType: 'mouse',
      target: edge,
      preventDefault: vi.fn(),
    } as unknown as React.PointerEvent<HTMLElement>)
    expect(sendSpy).not.toHaveBeenCalled()
    document.body.removeChild(edge)
  })

  it('pointerup on a node target STILL fires CANVAS_POINTER_UP (rubberband ending over a node must commit)', () => {
    const { result } = renderHook(() => useMouse(), RF_OPTS)
    const node = document.createElement('div')
    node.className = 'react-flow__node'
    document.body.appendChild(node)
    result.current.onPointerUp({
      clientX: 30, clientY: 40, button: 0,
      shiftKey: false, ctrlKey: false, altKey: false, metaKey: false,
      pointerType: 'mouse',
      target: node,
      preventDefault: vi.fn(),
    } as unknown as React.PointerEvent<HTMLElement>)
    expect(sendSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'CANVAS_POINTER_UP' }))
    document.body.removeChild(node)
  })

  it('pen pointerdown fires CANVAS_POINTER_DOWN like a mouse (no filter)', () => {
    const { result } = renderHook(() => useMouse(), RF_OPTS)
    const target = document.createElement('div')
    result.current.onPointerDown({
      pointerType: 'pen', clientX: 10, clientY: 20, button: 0,
      shiftKey: false, ctrlKey: false, altKey: false, metaKey: false,
      preventDefault: vi.fn(), target,
    } as unknown as React.PointerEvent<HTMLElement>)
    expect(sendSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'CANVAS_POINTER_DOWN',
      point: { x: 10, y: 20 },
      button: 'left',
    }))
  })

  it('pen pointermove fires CANVAS_POINTER_MOVE', () => {
    const { result } = renderHook(() => useMouse(), RF_OPTS)
    result.current.onPointerMove({
      pointerType: 'pen', clientX: 30, clientY: 40,
      shiftKey: false, ctrlKey: false, altKey: false, metaKey: false,
      preventDefault: vi.fn(),
    } as unknown as React.PointerEvent<HTMLElement>)
    expect(sendSpy).toHaveBeenCalledWith({
      type: 'CANVAS_POINTER_MOVE',
      point: { x: 30, y: 40 },
    })
  })

  it('pen pointerup fires CANVAS_POINTER_UP', () => {
    const { result } = renderHook(() => useMouse(), RF_OPTS)
    const target = document.createElement('div')
    result.current.onPointerUp({
      pointerType: 'pen', clientX: 50, clientY: 60, button: 0,
      shiftKey: false, ctrlKey: false, altKey: false, metaKey: false,
      preventDefault: vi.fn(), target,
    } as unknown as React.PointerEvent<HTMLElement>)
    expect(sendSpy).toHaveBeenCalledWith({
      type: 'CANVAS_POINTER_UP',
      point: { x: 50, y: 60 },
    })
  })
})
