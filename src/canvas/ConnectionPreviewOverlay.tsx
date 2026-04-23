import { useEffect, useState } from 'react'
import { useInteractionStore } from '@/interaction/interactionStore'
import { useDiagramStore } from '@/state/diagramStore'
import { useViewportStore } from '@/state/viewportStore'
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

  // Matches InlineRenameOverlay's screen-space math: the wrapper div sits at
  // (0,0) in page coords, so `clientX/clientY` is already the right space.
  const sx = (sourceNode.position.x + sourceNode.size.width / 2) * zoom + pan.x
  const sy = (sourceNode.position.y + sourceNode.size.height / 2) * zoom + pan.y

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
      <circle cx={sx} cy={sy} r={4} fill="#3b82f6" />
    </svg>
  )
}
