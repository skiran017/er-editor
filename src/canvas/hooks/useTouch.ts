import type { PointerEvent as ReactPointerEvent } from 'react'
import { useRef } from 'react'
import { useReactFlow } from '@xyflow/react'
import { useInteractionStore } from '@/interaction/interactionStore'
import { NO_MODIFIERS } from '@/interaction/events'

export interface TouchHandlers {
  readonly onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void
  readonly onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void
  readonly onPointerUp: (e: ReactPointerEvent<HTMLElement>) => void
  readonly onPointerCancel: (e: ReactPointerEvent<HTMLElement>) => void
}

// Points reported to the FSM are in WORLD / flow coordinates — see useMouse
// for the rationale. screenToFlowPosition is an identity when no <ReactFlow>
// is mounted, so unit tests keep working unchanged.
//
// Pinch-zoom contract:
//  - `activePointerId` tracks the FIRST finger (primary touch for drag/selection).
//  - `secondPointerId` tracks the SECOND finger when present.
//  - While both fingers are down, every pointermove dispatches WHEEL_ZOOM using
//    the midpoint as anchor and (newDist - lastDist) * PINCH_ZOOM_FACTOR as delta.
//  - CANVAS_POINTER_MOVE is suppressed while secondPointerId is non-null so the
//    FSM does not misinterpret a pinch as a drag.
//  - Lifting the second finger clears secondPointerId and restores single-finger
//    behaviour immediately — no FSM event is sent for the second-finger lift.
const PINCH_ZOOM_FACTOR = 0.005

export const useTouch = (): TouchHandlers => {
  const activePointerId = useRef<number | null>(null)
  const secondPointerId = useRef<number | null>(null)
  const lastDist = useRef<number>(0)
  // Per-pointer last client-space position, keyed by pointerId. Used to compute
  // pinch distance when only one of the two fingers moves.
  const pointerById = useRef<Map<number, { x: number; y: number }>>(new Map())
  // Palm rejection: track whether a pen pointer is currently down. When a pen
  // is active, any simultaneous touch event is treated as an accidental palm
  // contact and silently dropped. The pen itself flows through useMouse, so
  // we never dispatch FSM events for pen here — only update this flag.
  const penActiveRef = useRef<boolean>(false)
  const { screenToFlowPosition } = useReactFlow()
  const toFlow = (e: { clientX: number; clientY: number }) =>
    screenToFlowPosition({ x: e.clientX, y: e.clientY })

  return {
    onPointerDown: (e) => {
      if (e.pointerType === 'pen') {
        // Record that a pen is in contact so concurrent touches can be rejected.
        penActiveRef.current = true
        return
      }
      if (e.pointerType !== 'touch') return
      if (penActiveRef.current) return  // palm rejection — pen is active, drop touch

      // Record pointer position regardless of which finger this is.
      pointerById.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

      if (activePointerId.current === null) {
        activePointerId.current = e.pointerId
        useInteractionStore.getState().send({
          type: 'CANVAS_POINTER_DOWN',
          point: toFlow(e),
          modifiers: NO_MODIFIERS,
          button: 'left',
        })
      } else if (secondPointerId.current === null && e.pointerId !== activePointerId.current) {
        secondPointerId.current = e.pointerId
        // Compute initial pinch distance from both stored positions so the first
        // move event produces a meaningful delta rather than jumping from zero.
        const p1 = pointerById.current.get(activePointerId.current)!
        const p2 = pointerById.current.get(e.pointerId)!
        lastDist.current = Math.hypot(p2.x - p1.x, p2.y - p1.y)
        // Don't dispatch CANVAS_POINTER_DOWN — second finger is for gesture only.
      }
    },
    onPointerMove: (e) => {
      if (e.pointerType !== 'touch') return
      // Only process moves for pointers we are already tracking.
      if (!pointerById.current.has(e.pointerId)) return
      // Update stored position before computing distance so both p1 and p2 are current.
      pointerById.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

      if (secondPointerId.current !== null) {
        // Two-finger pinch path: compute new distance and dispatch WHEEL_ZOOM.
        const p1 = pointerById.current.get(activePointerId.current!)!
        const p2 = pointerById.current.get(secondPointerId.current)!
        const newDist = Math.hypot(p2.x - p1.x, p2.y - p1.y)
        const delta = (newDist - lastDist.current) * PINCH_ZOOM_FACTOR
        lastDist.current = newDist
        const midClient = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
        const anchor = screenToFlowPosition(midClient)
        useInteractionStore.getState().send({ type: 'WHEEL_ZOOM', anchor, delta })
        // Suppress CANVAS_POINTER_MOVE — the FSM must not see a drag while pinching.
        return
      }

      // Single-finger path: only the active pointer triggers FSM moves.
      if (e.pointerId !== activePointerId.current) return
      useInteractionStore.getState().send({
        type: 'CANVAS_POINTER_MOVE',
        point: toFlow(e),
      })
    },
    onPointerUp: (e) => {
      if (e.pointerType === 'pen') {
        // Clear the pen-active flag so subsequent touches are accepted again.
        penActiveRef.current = false
        return
      }
      if (e.pointerType !== 'touch') return
      pointerById.current.delete(e.pointerId)

      if (e.pointerId === secondPointerId.current) {
        // Second finger lifted: exit gesture mode, restore single-finger behaviour.
        secondPointerId.current = null
        lastDist.current = 0
        // No FSM event — lifting the second finger is a gesture boundary, not a selection.
        return
      }

      if (e.pointerId !== activePointerId.current) return
      activePointerId.current = null
      // If a second finger is somehow still tracked (shouldn't happen in normal flow), clear it.
      secondPointerId.current = null
      lastDist.current = 0
      useInteractionStore.getState().send({
        type: 'CANVAS_POINTER_UP',
        point: toFlow(e),
      })
    },
    // Recovery path for OS-level pointer interruptions (lost pointer capture,
    // pen lifted outside the browser window, task-switch, etc.).  Without this,
    // a pen whose pointerup is never delivered leaves penActiveRef=true forever,
    // silently dropping every subsequent touch.  Similarly a touch whose
    // pointerup is swallowed leaves the FSM parked in maybeDragging/rubberBand.
    onPointerCancel: (e) => {
      if (e.pointerType === 'pen') {
        // Treat a cancelled pen the same as a normal pen lift: unblock touches.
        penActiveRef.current = false
        return
      }
      if (e.pointerType !== 'touch') return
      pointerById.current.delete(e.pointerId)

      if (e.pointerId === secondPointerId.current) {
        // Second finger cancelled: exit gesture mode silently.
        secondPointerId.current = null
        lastDist.current = 0
        return
      }

      if (e.pointerId !== activePointerId.current) return
      // Interrupted touch: clear the tracked pointer and tell the FSM the
      // sequence ended so it doesn't stay stuck in an in-progress drag state.
      activePointerId.current = null
      secondPointerId.current = null
      lastDist.current = 0
      useInteractionStore.getState().send({
        type: 'CANVAS_POINTER_UP',
        point: toFlow(e),
      })
    },
  }
}
