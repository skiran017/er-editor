import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react'
import { useInteractionStore } from '@/interaction/interactionStore'
import type { Modifiers, PointerButton } from '@/interaction/events'

const readModifiers = (e: { shiftKey: boolean; ctrlKey: boolean; altKey: boolean; metaKey: boolean }): Modifiers => ({
  shift: e.shiftKey, ctrl: e.ctrlKey, alt: e.altKey, meta: e.metaKey,
})

const readButton = (button: number): PointerButton =>
  button === 1 ? 'middle' : button === 2 ? 'right' : 'left'

const readPoint = (e: { clientX: number; clientY: number }) => ({ x: e.clientX, y: e.clientY })

export interface MouseHandlers {
  readonly onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void
  readonly onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void
  readonly onPointerUp: (e: ReactPointerEvent<HTMLElement>) => void
  readonly onWheel: (e: ReactWheelEvent<HTMLElement>) => void
}

const WHEEL_ZOOM_STEP = 0.1

export const useMouse = (): MouseHandlers => ({
  onPointerDown: (e) => {
    if (e.pointerType === 'touch') return
    useInteractionStore.getState().send({
      type: 'CANVAS_POINTER_DOWN',
      point: readPoint(e),
      modifiers: readModifiers(e),
      button: readButton(e.button),
    })
  },
  onPointerMove: (e) => {
    if (e.pointerType === 'touch') return
    useInteractionStore.getState().send({
      type: 'CANVAS_POINTER_MOVE',
      point: readPoint(e),
    })
  },
  onPointerUp: (e) => {
    if (e.pointerType === 'touch') return
    useInteractionStore.getState().send({
      type: 'CANVAS_POINTER_UP',
      point: readPoint(e),
    })
  },
  onWheel: (e) => {
    if (!e.ctrlKey && !e.metaKey) return  // Ctrl/Meta+wheel = zoom; plain wheel = native scroll (or future horizontal pan)
    e.preventDefault()  // stop the browser's pinch-to-zoom / page-scroll
    const delta = e.deltaY < 0 ? WHEEL_ZOOM_STEP : -WHEEL_ZOOM_STEP
    useInteractionStore.getState().send({
      type: 'WHEEL_ZOOM',
      anchor: readPoint(e),
      delta,
    })
  },
})
