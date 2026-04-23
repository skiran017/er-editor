import { memo } from 'react'
import { BaseEdge, getStraightPath, type EdgeProps } from '@xyflow/react'
import { CardinalityLabel } from '@/notation/chen/cardinality'
import { useFloatingEdge } from '@/canvas/hooks/useFloatingEdge'
import { useDiagramStore } from '@/state/diagramStore'
import type { EntityRelationshipEdge as EREdgeModel } from '@/domain/types'
import type { NotationEdgeData } from '@/notation/types'

export const EntityRelationshipEdge = memo(
  ({
    id,
    source,
    target,
    sourceX,
    sourceY,
    targetX,
    targetY,
    data,
  }: EdgeProps) => {
    const edgeId = (data as NotationEdgeData).edgeId
    const edge = useDiagramStore((s) => s.diagram.edgesById[edgeId]) as
      | EREdgeModel
      | undefined
    // Floating attachment on both ends so the edge rotates around entity AND
    // relationship as either moves. Chen lines are conventionally straight.
    const float = useFloatingEdge(source, target)
    if (!edge || edge.kind !== 'entity-relationship') return null

    const [path, labelX, labelY] = float
      ? getStraightPath({ sourceX: float.sx, sourceY: float.sy, targetX: float.tx, targetY: float.ty })
      : getStraightPath({ sourceX, sourceY, targetX, targetY })

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
