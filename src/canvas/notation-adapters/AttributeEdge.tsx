import { memo } from 'react'
import { getStraightPath, type EdgeProps } from '@xyflow/react'
import { useFloatingEdge } from '@/canvas/hooks/useFloatingEdge'
import { AttributeEdgeGlyph } from '@/notation/chen/edges/AttributeEdgeGlyph'
import { useDiagramStore } from '@/state/diagramStore'
import type { AttributeEdge as AttrEdgeModel } from '@/domain/types'
import type { NotationEdgeData } from '@/notation/types'

export const AttributeEdge = memo(({ source, target, data }: EdgeProps) => {
  const edgeId = (data as NotationEdgeData).edgeId
  const edge = useDiagramStore((s) => s.diagram.edgesById[edgeId]) as
    | AttrEdgeModel
    | undefined
  const float = useFloatingEdge(source, target)
  if (!edge || edge.kind !== 'attribute-of' || !float) return null

  const [path] = getStraightPath({
    sourceX: float.sx,
    sourceY: float.sy,
    targetX: float.tx,
    targetY: float.ty,
  })

  return <AttributeEdgeGlyph path={path} />
})
AttributeEdge.displayName = 'AttributeEdge'
