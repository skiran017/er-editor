import { memo } from 'react'
import { getSmoothStepPath, Position, type EdgeProps } from '@xyflow/react'
import {
  useFloatingEdge,
  type EdgePosition,
} from '@/canvas/hooks/useFloatingEdge'
import { EntityRelationshipEdgeGlyph } from '@/notation/chen/edges/EntityRelationshipEdgeGlyph'
import { useDiagramStore } from '@/state/diagramStore'
import type { EntityRelationshipEdge as EREdgeModel } from '@/domain/types'
import type { NotationEdgeData } from '@/notation/types'

const toRfPosition = (p: EdgePosition): Position => {
  switch (p) {
    case 'top':
      return Position.Top
    case 'right':
      return Position.Right
    case 'bottom':
      return Position.Bottom
    case 'left':
      return Position.Left
  }
}

export const EntityRelationshipEdge = memo(
  ({ source, target, data }: EdgeProps) => {
    const edgeId = (data as NotationEdgeData).edgeId
    const edge = useDiagramStore((s) => s.diagram.edgesById[edgeId]) as
      | EREdgeModel
      | undefined
    const float = useFloatingEdge(source, target)
    if (!edge || edge.kind !== 'entity-relationship' || !float) return null

    const [path, labelX, labelY] = getSmoothStepPath({
      sourceX: float.sx,
      sourceY: float.sy,
      targetX: float.tx,
      targetY: float.ty,
      sourcePosition: toRfPosition(float.sourcePosition),
      targetPosition: toRfPosition(float.targetPosition),
    })

    return (
      <EntityRelationshipEdgeGlyph
        path={path}
        labelX={labelX}
        labelY={labelY}
        cardinality={edge.cardinality}
        participation={edge.participation}
        role={edge.role}
      />
    )
  },
)
EntityRelationshipEdge.displayName = 'EntityRelationshipEdge'
