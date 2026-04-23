import { memo } from 'react'
import { BaseEdge, getStraightPath, type EdgeProps } from '@xyflow/react'
import { useDiagramStore } from '@/state/diagramStore'
import type { AttributeEdge as AttrEdgeModel } from '@/domain/types'
import type { NotationEdgeData } from '@/notation/types'

export const AttributeEdge = memo(
  ({ id, sourceX, sourceY, targetX, targetY, data }: EdgeProps) => {
    const edgeId = (data as NotationEdgeData).edgeId
    const edge = useDiagramStore((s) => s.diagram.edgesById[edgeId]) as
      | AttrEdgeModel
      | undefined
    if (!edge || edge.kind !== 'attribute-of') return null

    const [path] = getStraightPath({ sourceX, sourceY, targetX, targetY })

    return (
      <BaseEdge
        id={id}
        path={path}
        style={{ stroke: '#475569', strokeWidth: 1.5, fill: 'none' }}
      />
    )
  },
)
AttributeEdge.displayName = 'AttributeEdge'
