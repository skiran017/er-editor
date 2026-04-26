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
export const useTouch = (): TouchHandlers => {
  const activePointerId = useRef<number | null>(null)
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
      if (activePointerId.current !== null) return  // ignore second finger (pinch = Sub-project 4)
      activePointerId.current = e.pointerId
      useInteractionStore.getState().send({
        type: 'CANVAS_POINTER_DOWN',
        point: toFlow(e),
        modifiers: NO_MODIFIERS,
        button: 'left',
      })
    },
    onPointerMove: (e) => {
      if (e.pointerType !== 'touch') return
      // Touches rejected at pointerdown never set activePointerId, so the
      // pointerId check below already silences their subsequent moves.
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
      if (e.pointerId !== activePointerId.current) return
      activePointerId.current = null
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
      if (e.pointerId !== activePointerId.current) return
      // Interrupted touch: clear the tracked pointer and tell the FSM the
      // sequence ended so it doesn't stay stuck in an in-progress drag state.
      activePointerId.current = null
      useInteractionStore.getState().send({
        type: 'CANVAS_POINTER_UP',
        point: toFlow(e),
      })
    },
  }
}
