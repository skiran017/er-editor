import { useEffect, useState } from 'react'
import { useInteractionStore } from '@/interaction/interactionStore'
import { useDiagramStore } from '@/state/diagramStore'
import { useViewportStore } from '@/state/viewportStore'
import { chooseSide, sidePort } from '@/canvas/hooks/useFloatingEdge'
import { bboxContains, bboxFromNodeLike } from '@/domain/geometry'
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

  const worldCursor = {
    x: (cursor.x - pan.x) / zoom,
    y: (cursor.y - pan.y) / zoom,
  }
  const worldSource = {
    id: sourceNode.id,
    position: sourceNode.position,
    width: sourceNode.size.width,
    height: sourceNode.size.height,
    measured: { width: sourceNode.size.width, height: sourceNode.size.height },
  }

  // Detect whether the cursor is hovering over a valid target node. Walk
  // nodeOrder in REVERSE so the topmost rendered node wins when bboxes overlap.
  // Source is excluded (you can't connect a node to itself).
  let hoveredTarget: typeof sourceNode | null = null
  for (let i = diagram.nodeOrder.length - 1; i >= 0; i--) {
    const id = diagram.nodeOrder[i]!
    if (id === sourceId) continue
    const n = diagram.nodesById[id]
    if (!n) continue
    if (bboxContains(bboxFromNodeLike(n), worldCursor)) {
      hoveredTarget = n
      break
    }
  }

  // Geometry: when hovering a target, both endpoints snap to the target's /
  // source's cardinal midpoints so the preview lines up with the real edge
  // that would be created on click. Otherwise, the source port aims toward
  // the cursor and the line ends at the cursor (free-roaming).
  let worldSx: number, worldSy: number, worldTx: number, worldTy: number
  if (hoveredTarget) {
    const worldTarget = {
      id: hoveredTarget.id,
      position: hoveredTarget.position,
      width: hoveredTarget.size.width,
      height: hoveredTarget.size.height,
      measured: { width: hoveredTarget.size.width, height: hoveredTarget.size.height },
    }
    const sPort = sidePort(worldSource, chooseSide(worldSource, worldTarget))
    const tPort = sidePort(worldTarget, chooseSide(worldTarget, worldSource))
    worldSx = sPort.x
    worldSy = sPort.y
    worldTx = tPort.x
    worldTy = tPort.y
  } else {
    const cursorFloat = {
      id: '__cursor__',
      position: worldCursor,
      width: 0,
      height: 0,
      measured: { width: 0, height: 0 },
    }
    const sPort = sidePort(worldSource, chooseSide(worldSource, cursorFloat))
    worldSx = sPort.x
    worldSy = sPort.y
    worldTx = worldCursor.x
    worldTy = worldCursor.y
  }

  const sx = worldSx * zoom + pan.x
  const sy = worldSy * zoom + pan.y
  const tx = worldTx * zoom + pan.x
  const ty = worldTy * zoom + pan.y

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-20 h-full w-full"
      data-role="connection-preview"
    >
      <line
        x1={sx}
        y1={sy}
        x2={tx}
        y2={ty}
        stroke="var(--er-connection-preview)"
        strokeWidth={1.5}
        strokeDasharray="6 4"
        data-snapped={hoveredTarget ? 'true' : 'false'}
      />
    </svg>
  )
}
