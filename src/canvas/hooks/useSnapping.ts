import { useCallback } from 'react'
import { snap, type SnapResult } from '@/domain/snap'
import type { NodeId, Point } from '@/domain/types'
import { useDiagramStore } from '@/state/diagramStore'
import { useUiStore } from '@/state/uiStore'

export interface SnappingApi {
  readonly applySnap: (draggedId: NodeId, proposedPosition: Point) => SnapResult
}

export const useSnapping = (): SnappingApi => {
  const snapConfig = useUiStore((s) => s.snap)

  const applySnap = useCallback(
    (draggedId: NodeId, proposedPosition: Point): SnapResult => {
      const diagram = useDiagramStore.getState().diagram
      const dragged = diagram.nodesById[draggedId]
      if (!dragged) {
        return snap(
          { position: proposedPosition, size: { width: 0, height: 0 } },
          [],
          snapConfig,
        )
      }
      const others = diagram.nodeOrder
        .filter((id) => id !== draggedId)
        .map((id) => diagram.nodesById[id])
        .map((n) => ({ position: n.position, size: n.size }))
      return snap(
        { position: proposedPosition, size: dragged.size },
        others,
        snapConfig,
      )
    },
    [snapConfig],
  )

  return { applySnap }
}
