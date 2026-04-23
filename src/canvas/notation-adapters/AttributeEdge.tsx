import { memo } from 'react'
import { getStraightPath, type EdgeProps } from '@xyflow/react'
import { AttributeEdgeGlyph } from '@/notation/chen/edges/AttributeEdgeGlyph'
import { useDiagramStore } from '@/state/diagramStore'
import type { AttributeEdge as AttrEdgeModel } from '@/domain/types'
import type { NotationEdgeData } from '@/notation/types'

export const AttributeEdge = memo(
  ({ sourceX, sourceY, targetX, targetY, data }: EdgeProps) => {
    const edgeId = (data as NotationEdgeData).edgeId
    const edge = useDiagramStore((s) => s.diagram.edgesById[edgeId]) as
      | AttrEdgeModel
      | undefined
    if (!edge || edge.kind !== 'attribute-of') return null

    const [path] = getStraightPath({ sourceX, sourceY, targetX, targetY })

    return <AttributeEdgeGlyph path={path} />
  },
)
AttributeEdge.displayName = 'AttributeEdge'
