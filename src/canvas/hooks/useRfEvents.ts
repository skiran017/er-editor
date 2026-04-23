import { useCallback } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import type { Node as RfNode, Edge as RfEdge } from '@xyflow/react'
import { useInteractionStore } from '@/interaction/interactionStore'
import type { Modifiers, PointerButton } from '@/interaction/events'
import type { NodeId, EdgeId } from '@/domain/types'

const readModifiers = (e: {
  shiftKey: boolean; ctrlKey: boolean; altKey: boolean; metaKey: boolean
}): Modifiers => ({
  shift: e.shiftKey, ctrl: e.ctrlKey, alt: e.altKey, meta: e.metaKey,
})

const readButton = (button: number): PointerButton =>
  button === 1 ? 'middle' : button === 2 ? 'right' : 'left'

export interface RfEventHandlers {
  readonly onNodeClick: (e: ReactMouseEvent, node: RfNode) => void
  readonly onEdgeClick: (e: ReactMouseEvent, edge: RfEdge) => void
}

/**
 * React Flow v12 catches pointer events on its internal node/edge wrappers
 * before they bubble to the outer wrapper div (where {@link useMouse} lives).
 * This hook produces the per-element handlers we attach to `<ReactFlow>` so
 * the FSM receives NODE/EDGE events.
 *
 * Note: we deliberately do NOT wire `onPaneClick`. Pane pointer events bubble
 * up through the wrapper div and are handled by `useMouse`, which is the
 * single source of truth for CANVAS_POINTER_* events. Dispatching them here
 * too would double-fire (root cause of the "two stacked entities" bug).
 *
 * Why we synthesize CANVAS_POINTER_UP after NODE_POINTER_DOWN:
 * React Flow's `onNodeClick` fires AFTER mouseup — it represents a completed
 * click — but RF swallows the real pointer-down/up events on nodes before
 * they bubble to `useMouse`. That means the FSM sees NODE_POINTER_DOWN with
 * no matching UP. `selecting.maybeDragging` then sits in "button held" state,
 * and the next mouse move crosses the drag threshold → node follows the
 * cursor forever (the "drag-follow" bug). We emit a synthetic
 * CANVAS_POINTER_UP at the same point to model a click as an atomic event:
 * maybeDragging → idle immediately, no stray drag.
 */
export const useRfEvents = (): RfEventHandlers => {
  const onNodeClick = useCallback((e: ReactMouseEvent, node: RfNode) => {
    const point = { x: e.clientX, y: e.clientY }
    const send = useInteractionStore.getState().send
    send({
      type: 'NODE_POINTER_DOWN',
      nodeId: node.id as NodeId,
      point,
      modifiers: readModifiers(e),
      button: readButton(e.button),
    })
    // React Flow fires onNodeClick after mouseup, so synthesize the matching
    // UP to keep the FSM out of drag-held state.
    send({ type: 'CANVAS_POINTER_UP', point })
  }, [])

  const onEdgeClick = useCallback((e: ReactMouseEvent, edge: RfEdge) => {
    const point = { x: e.clientX, y: e.clientY }
    const send = useInteractionStore.getState().send
    send({
      type: 'EDGE_POINTER_DOWN',
      edgeId: edge.id as EdgeId,
      point,
      modifiers: readModifiers(e),
      button: readButton(e.button),
    })
    // Same rationale as onNodeClick — complete the click atomically.
    send({ type: 'CANVAS_POINTER_UP', point })
  }, [])

  return { onNodeClick, onEdgeClick }
}
