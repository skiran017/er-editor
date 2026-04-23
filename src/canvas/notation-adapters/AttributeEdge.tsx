import { memo } from 'react'
import { BaseEdge, getStraightPath, type EdgeProps } from '@xyflow/react'
import { useFloatingEdge } from '@/canvas/hooks/useFloatingEdge'
import { useDiagramStore } from '@/state/diagramStore'
import type { AttributeEdge as AttrEdgeModel } from '@/domain/types'
import type { NotationEdgeData } from '@/notation/types'

export const AttributeEdge = memo(
  ({ id, source, target, sourceX, sourceY, targetX, targetY, data }: EdgeProps) => {
    const edgeId = (data as NotationEdgeData).edgeId
    const edge = useDiagramStore((s) => s.diagram.edgesById[edgeId]) as
      | AttrEdgeModel
      | undefined
    // Floating attachment: the path endpoints snap to the nearest point on
    // each node's boundary, computed from the line between centres. This is
    // what makes the edge visibly rotate as either node moves, instead of
    // being locked to a fixed right/left handle.
    const float = useFloatingEdge(source, target, edgeId)
    if (!edge || edge.kind !== 'attribute-of') return null

    const [path] = float
      ? getStraightPath({ sourceX: float.sx, sourceY: float.sy, targetX: float.tx, targetY: float.ty })
      : getStraightPath({ sourceX, sourceY, targetX, targetY })

    return (
      <BaseEdge
        id={id}
        path={path}
        style={{ stroke: 'var(--er-edge-attribute-stroke)', strokeWidth: 1.5, fill: 'none' }}
      />
    )
  },
)
AttributeEdge.displayName = 'AttributeEdge'
