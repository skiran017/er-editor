import { useCallback } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { useReactFlow, type Node as RfNode, type Edge as RfEdge } from '@xyflow/react'
import { useInteractionStore } from '@/interaction/interactionStore'
import { useDiagramStore } from '@/state/diagramStore'
import { useUiStore } from '@/state/uiStore'
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
  readonly onNodeDoubleClick: (e: ReactMouseEvent, node: RfNode) => void
  readonly onPaneClick: (e: ReactMouseEvent) => void
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
  const { screenToFlowPosition } = useReactFlow()

  const onNodeClick = useCallback((e: ReactMouseEvent, node: RfNode) => {
    // Every FSM Point is a world-space point. See useMouse for rationale.
    const point = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    const send = useInteractionStore.getState().send
    send({
      type: 'NODE_POINTER_DOWN',
      nodeId: node.id as NodeId,
      point,
      modifiers: readModifiers(e),
      button: readButton(e.button),
    })
    // Only flush `selecting.maybeDragging` with a synthetic UP. In every other
    // state (placing, drawing.connection, …) the native pointerup has already
    // bubbled through useMouse as CANVAS_POINTER_UP, so emitting another one
    // here would double-trigger side effects — e.g. placing two entities
    // from a single click on an existing node.
    const after = useInteractionStore.getState().snapshot
    if (after.matches({ selecting: 'maybeDragging' })) {
      send({ type: 'CANVAS_POINTER_UP', point })
    }
  }, [screenToFlowPosition])

  const onEdgeClick = useCallback((e: ReactMouseEvent, edge: RfEdge) => {
    const point = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    const send = useInteractionStore.getState().send
    send({
      type: 'EDGE_POINTER_DOWN',
      edgeId: edge.id as EdgeId,
      point,
      modifiers: readModifiers(e),
      button: readButton(e.button),
    })
    // Same selective-flush rationale as onNodeClick: only emit the synthetic
    // UP when the FSM is parked in a click-held state that needs it.
    const after = useInteractionStore.getState().snapshot
    if (after.matches({ selecting: 'maybeDragging' })) {
      send({ type: 'CANVAS_POINTER_UP', point })
    }
  }, [screenToFlowPosition])

  // Bug 4 — double-click a node opens the inline rename overlay directly.
  // ISA nodes have no name (see src/domain/types.ts) so skip them.
  const onNodeDoubleClick = useCallback((_e: ReactMouseEvent, node: RfNode) => {
    const nodeId = node.id as NodeId
    const domainNode = useDiagramStore.getState().diagram.nodesById[nodeId]
    if (!domainNode) return
    if (domainNode.kind === 'isa') return
    useUiStore.getState().startInlineRename({
      nodeId,
      initialValue: (domainNode as { name: string }).name,
    })
  }, [])

  // RF only fires onPaneClick when the click target is the blank pane (not a
  // node or edge). That makes it the ONLY reliable signal we have to detect
  // "user clicked empty canvas", because useMouse's CANVAS_POINTER_DOWN
  // bubbles from node clicks too. Cancel-on-empty-click flows (e.g. the
  // Connect tool cancelling when the user clicks empty space) hang off this.
  const onPaneClick = useCallback((e: ReactMouseEvent) => {
    const point = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    useInteractionStore.getState().send({ type: 'PANE_CLICK', point })
  }, [screenToFlowPosition])

  return { onNodeClick, onEdgeClick, onNodeDoubleClick, onPaneClick }
}
