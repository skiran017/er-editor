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
 */
export const useRfEvents = (): RfEventHandlers => {
  const onNodeClick = useCallback((e: ReactMouseEvent, node: RfNode) => {
    useInteractionStore.getState().send({
      type: 'NODE_POINTER_DOWN',
      nodeId: node.id as NodeId,
      point: { x: e.clientX, y: e.clientY },
      modifiers: readModifiers(e),
      button: readButton(e.button),
    })
  }, [])

  const onEdgeClick = useCallback((e: ReactMouseEvent, edge: RfEdge) => {
    useInteractionStore.getState().send({
      type: 'EDGE_POINTER_DOWN',
      edgeId: edge.id as EdgeId,
      point: { x: e.clientX, y: e.clientY },
      modifiers: readModifiers(e),
      button: readButton(e.button),
    })
  }, [])

  return { onNodeClick, onEdgeClick }
}
