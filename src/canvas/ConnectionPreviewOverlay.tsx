import { useEffect, useState } from 'react'
import { useInteractionStore } from '@/interaction/interactionStore'
import { useDiagramStore } from '@/state/diagramStore'
import { useViewportStore } from '@/state/viewportStore'
import { getNodeIntersection } from '@/canvas/hooks/useFloatingEdge'
import type { NodeId } from '@/domain/types'

/**
 * Draws a dashed preview line from the picked node's centre to the cursor while
 * the FSM is waiting for the user to pick a second node in any connect-style
 * flow. Without this overlay, clicking the first node in `connect` /
 * `quickRelationship` / `quickGeneralization` / `connectToGeneralization` gave
 * no visual feedback — the user couldn't tell their click registered.
 *
 * The FSM stores the first-picked node id in one of two context fields:
 *   - `connectionFromId` for `connect` and `connectToGeneralization`
 *   - `quickFirstId` for `quickRelationship` and `quickGeneralization`
 *
 * This component reads whichever is set.
 */
export const ConnectionPreviewOverlay = () => {
  const snapshot = useInteractionStore((s) => s.snapshot)
  const diagram = useDiagramStore((s) => s.diagram)
  const zoom = useViewportStore((s) => s.zoom)
  const pan = useViewportStore((s) => s.pan)

  const isConnecting =
    snapshot.matches({ drawing: { connection: 'fromPicked' } })
    || snapshot.matches({ quickRelationship: 'firstPicked' })
    || snapshot.matches({ quickGeneralization: 'firstPicked' })
    || snapshot.matches({ connectToGeneralization: 'waitingForChild' })

  // `connect` + `connectToGeneralization` store the source in connectionFromId.
  // `quickRelationship` + `quickGeneralization` store it in quickFirstId.
  const sourceId: NodeId | null =
    snapshot.context.connectionFromId ?? snapshot.context.quickFirstId ?? null

  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!isConnecting) {
      setCursor(null)
      return
    }
    const onMove = (e: PointerEvent) => {
      setCursor({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [isConnecting])

  if (!isConnecting || !sourceId || !cursor) return null
  const sourceNode = diagram.nodesById[sourceId]
  if (!sourceNode) return null

  // Start the preview line at the source node's BOUNDARY (not its centre) so
  // it visibly exits the shape. We convert the cursor back to diagram coords,
  // model the cursor as a zero-size floatable node, and reuse the floating-
  // edge intersection math. getNodeIntersection returns a finite fallback for
  // coincident / zero-area inputs (see useFloatingEdge.test.ts).
  const worldSource = {
    id: sourceNode.id,
    position: sourceNode.position,
    width: sourceNode.size.width,
    height: sourceNode.size.height,
    measured: { width: sourceNode.size.width, height: sourceNode.size.height },
  }
  const worldCursor = {
    id: '__cursor__',
    position: {
      x: (cursor.x - pan.x) / zoom,
      y: (cursor.y - pan.y) / zoom,
    },
    width: 0,
    height: 0,
    measured: { width: 0, height: 0 },
  }
  const boundary = getNodeIntersection(worldSource, worldCursor)
  // Defensive: if the math ever returns NaN, fall back to the centre so the
  // preview line still renders.
  const centreX = sourceNode.position.x + sourceNode.size.width / 2
  const centreY = sourceNode.position.y + sourceNode.size.height / 2
  const worldSx = Number.isFinite(boundary.x) ? boundary.x : centreX
  const worldSy = Number.isFinite(boundary.y) ? boundary.y : centreY
  const sx = worldSx * zoom + pan.x
  const sy = worldSy * zoom + pan.y

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-20 h-full w-full"
      data-role="connection-preview"
    >
      <line
        x1={sx}
        y1={sy}
        x2={cursor.x}
        y2={cursor.y}
        stroke="#3b82f6"
        strokeWidth={1.5}
        strokeDasharray="6 4"
      />
    </svg>
  )
}
