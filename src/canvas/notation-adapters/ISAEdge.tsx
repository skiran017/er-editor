import { memo } from 'react'
import { BaseEdge, getStraightPath, type EdgeProps } from '@xyflow/react'
import { useFloatingEdge } from '@/canvas/hooks/useFloatingEdge'
import { useDiagramStore } from '@/state/diagramStore'
import type { ISAEdge as ISAEdgeModel } from '@/domain/types'
import type { NotationEdgeData } from '@/notation/types'

export const ISAEdge = memo(
  ({ id, source, target, sourceX, sourceY, targetX, targetY, data }: EdgeProps) => {
    const edgeId = (data as NotationEdgeData).edgeId
    const edge = useDiagramStore((s) => s.diagram.edgesById[edgeId]) as
      | ISAEdgeModel
      | undefined
    const float = useFloatingEdge(source, target)
    if (!edge || edge.kind !== 'isa-link') return null

    const [path] = float
      ? getStraightPath({ sourceX: float.sx, sourceY: float.sy, targetX: float.tx, targetY: float.ty })
      : getStraightPath({ sourceX, sourceY, targetX, targetY })

    return (
      <BaseEdge
        id={id}
        path={path}
        data-role={edge.role}
        style={{ stroke: '#334155', strokeWidth: 1.5, fill: 'none' }}
      />
    )
  },
)
ISAEdge.displayName = 'ISAEdge'
