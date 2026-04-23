import type { PointerEvent as ReactPointerEvent } from 'react'
import { useRef } from 'react'
import { useReactFlow } from '@xyflow/react'
import { useInteractionStore } from '@/interaction/interactionStore'
import { NO_MODIFIERS } from '@/interaction/events'

export interface TouchHandlers {
  readonly onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void
  readonly onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void
  readonly onPointerUp: (e: ReactPointerEvent<HTMLElement>) => void
}

// Points reported to the FSM are in WORLD / flow coordinates — see useMouse
// for the rationale. screenToFlowPosition is an identity when no <ReactFlow>
// is mounted, so unit tests keep working unchanged.
export const useTouch = (): TouchHandlers => {
  const activePointerId = useRef<number | null>(null)
  const { screenToFlowPosition } = useReactFlow()
  const toFlow = (e: { clientX: number; clientY: number }) =>
    screenToFlowPosition({ x: e.clientX, y: e.clientY })

  return {
    onPointerDown: (e) => {
      if (e.pointerType !== 'touch') return
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
      if (e.pointerId !== activePointerId.current) return
      useInteractionStore.getState().send({
        type: 'CANVAS_POINTER_MOVE',
        point: toFlow(e),
      })
    },
    onPointerUp: (e) => {
      if (e.pointerType !== 'touch') return
      if (e.pointerId !== activePointerId.current) return
      activePointerId.current = null
      useInteractionStore.getState().send({
        type: 'CANVAS_POINTER_UP',
        point: toFlow(e),
      })
    },
  }
}
