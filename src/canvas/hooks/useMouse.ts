import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react'
import { useReactFlow } from '@xyflow/react'
import { useInteractionStore } from '@/interaction/interactionStore'
import type { Modifiers, PointerButton } from '@/interaction/events'

const readModifiers = (e: { shiftKey: boolean; ctrlKey: boolean; altKey: boolean; metaKey: boolean }): Modifiers => ({
  shift: e.shiftKey, ctrl: e.ctrlKey, alt: e.altKey, meta: e.metaKey,
})

const readButton = (button: number): PointerButton =>
  button === 1 ? 'middle' : button === 2 ? 'right' : 'left'

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

  return {
    onPointerDown: (e) => {
      if (e.pointerType === 'touch') return
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
