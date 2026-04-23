import { memo } from 'react'
import { getSmoothStepPath, type EdgeProps } from '@xyflow/react'
import { EntityRelationshipEdgeGlyph } from '@/notation/chen/edges/EntityRelationshipEdgeGlyph'
import { useDiagramStore } from '@/state/diagramStore'
import type { EntityRelationshipEdge as EREdgeModel } from '@/domain/types'
import type { NotationEdgeData } from '@/notation/types'

export const EntityRelationshipEdge = memo(
  ({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
  }: EdgeProps) => {
    const edgeId = (data as NotationEdgeData).edgeId
    const edge = useDiagramStore((s) => s.diagram.edgesById[edgeId]) as
      | EREdgeModel
      | undefined
    if (!edge || edge.kind !== 'entity-relationship') return null

    const [path, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
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
