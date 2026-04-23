import { memo } from 'react'
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react'
import { CardinalityLabel } from '@/notation/chen/cardinality'
import { useDiagramStore } from '@/state/diagramStore'
import type { EntityRelationshipEdge as EREdgeModel } from '@/domain/types'
import type { NotationEdgeData } from '@/notation/types'

export const EntityRelationshipEdge = memo(
  ({
    id,
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
      <>
        <BaseEdge
          id={id}
          path={path}
          style={{
            stroke: '#334155',
            strokeWidth: 1.5,
            fill: 'none',
            strokeDasharray: edge.participation === 'partial' ? '4 4' : undefined,
          }}
        />
        <CardinalityLabel
          cardinality={edge.cardinality}
          participation={edge.participation}
          x={labelX}
          y={labelY}
        />
        {edge.role && (
          <text
            x={labelX}
            y={labelY - 14}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-slate-600 text-[10px] italic select-none pointer-events-none"
          >
            {edge.role}
          </text>
        )}
      </>
    )
  },
)
EntityRelationshipEdge.displayName = 'EntityRelationshipEdge'
