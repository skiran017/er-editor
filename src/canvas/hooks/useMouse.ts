import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react'
import { useReactFlow } from '@xyflow/react'
import { useInteractionStore } from '@/interaction/interactionStore'
import type { Modifiers, PointerButton } from '@/interaction/events'

const readModifiers = (e: { shiftKey: boolean; ctrlKey: boolean; altKey: boolean; metaKey: boolean }): Modifiers => ({
  shift: e.shiftKey, ctrl: e.ctrlKey, alt: e.altKey, meta: e.metaKey,
})

const readButton = (button: number): PointerButton =>
  button === 1 ? 'middle' : button === 2 ? 'right' : 'left'

// React Flow panels (Controls, MiniMap, custom `<Panel>` components) render
// inside the same wrapper div useMouse listens on. Without this filter, a
// click on the zoom-in / fit-view button in a placement tool would bubble up
// as CANVAS_POINTER_DOWN/UP and the FSM would create a node at the button's
// coords. Treat any pointer whose target sits inside a RF panel as chrome,
// not canvas.
const isRfChromeTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) return false
  return target.closest('.react-flow__panel, .react-flow__attribution') !== null
}

// React Flow v12 does NOT stop propagation on node/edge pointer events, so a
// pointerdown on a node bubbles up to this wrapper-level listener as well as
// RF's own onNodeClick / onNodeDrag handlers (in useRfEvents). Without this
// filter, clicking-and-dragging a node fires BOTH CANVAS_POINTER_DOWN
// (entering selecting.rubberBand) AND RF's native node drag — the user sees
// a phantom rubberband draw under their cursor while the node moves. Skip
// CANVAS_POINTER_DOWN when the gesture starts on a node or an edge; those
// targets get their semantic events from useRfEvents instead. We do NOT
// filter pointerUp — a rubberband started on empty canvas can legitimately
// end over a node, and CANVAS_POINTER_UP must fire to commit the selection.
const isNodeOrEdgeTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) return false
  return target.closest('.react-flow__node, .react-flow__edge') !== null
}

export interface MouseHandlers {
  readonly onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void
  readonly onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void
  readonly onPointerUp: (e: ReactPointerEvent<HTMLElement>) => void
  readonly onWheel: (e: ReactWheelEvent<HTMLElement>) => void
}

const WHEEL_ZOOM_STEP = 0.1

// Every `Point` the FSM receives is in WORLD / flow coordinates. Browsers
// give us client-space coords (pixels from the top-left of the window);
// React Flow's `screenToFlowPosition` subtracts the canvas origin and
// undoes the current pan/zoom so the resulting point is directly comparable
// to every node's stored `position`. When no <ReactFlow> is mounted (unit
// tests), `screenToFlowPosition` returns the input unchanged — so tests
// that assert raw client coords continue to pass without modification.
export const useMouse = (): MouseHandlers => {
  const { screenToFlowPosition } = useReactFlow()
  const toFlow = (e: { clientX: number; clientY: number }) =>
    screenToFlowPosition({ x: e.clientX, y: e.clientY })

  // Pen events (`pointerType === 'pen'`) intentionally pass through this hook
  // alongside mouse events. Pens have hover, accurate coordinates, and modifier
  // keys — from the FSM's perspective they behave like a mouse, so we don't
  // need a separate code path. The dedicated `useTouch` hook handles only
  // `pointerType === 'touch'` and includes palm rejection that drops touch
  // events while a pen pointer is active. The pen-event contract is locked
  // down by `pen pointerdown/move/up fires CANVAS_POINTER_*` tests in
  // useMouse.test.tsx.
  return {
    onPointerDown: (e) => {
      if (e.pointerType === 'touch') return
      if (isRfChromeTarget(e.target)) return
      if (isNodeOrEdgeTarget(e.target)) return
      useInteractionStore.getState().send({
        type: 'CANVAS_POINTER_DOWN',
        point: toFlow(e),
        modifiers: readModifiers(e),
        button: readButton(e.button),
      })
    },
    onPointerMove: (e) => {
      if (e.pointerType === 'touch') return
      useInteractionStore.getState().send({
        type: 'CANVAS_POINTER_MOVE',
        point: toFlow(e),
      })
    },
    onPointerUp: (e) => {
      if (e.pointerType === 'touch') return
      if (isRfChromeTarget(e.target)) return
      useInteractionStore.getState().send({
        type: 'CANVAS_POINTER_UP',
        point: toFlow(e),
      })
    },
    onWheel: (e) => {
      if (!e.ctrlKey && !e.metaKey) return  // Ctrl/Meta+wheel = zoom; plain wheel = native scroll (or future horizontal pan)
      e.preventDefault()  // stop the browser's pinch-to-zoom / page-scroll
      const delta = e.deltaY < 0 ? WHEEL_ZOOM_STEP : -WHEEL_ZOOM_STEP
      useInteractionStore.getState().send({
        type: 'WHEEL_ZOOM',
        anchor: toFlow(e),
        delta,
      })
    },
  }
}
