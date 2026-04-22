import { CardinalityLabel } from '../cardinality'
import type { Cardinality, Participation } from '@/domain/types'

export interface EntityRelationshipEdgeGlyphProps {
  readonly path: string
  readonly labelX: number
  readonly labelY: number
  readonly cardinality: Cardinality
  readonly participation: Participation
  readonly role?: string
}

export const EntityRelationshipEdgeGlyph = ({
  path,
  labelX,
  labelY,
  cardinality,
  participation,
  role,
}: EntityRelationshipEdgeGlyphProps) => (
  <g data-kind="entity-relationship">
    <path
      d={path}
      className="fill-none stroke-slate-700"
      strokeWidth={1.5}
      strokeDasharray={participation === 'partial' ? '4 4' : undefined}
    />
    <CardinalityLabel
      cardinality={cardinality}
      participation={participation}
      x={labelX}
      y={labelY}
    />
    {role && (
      <text
        x={labelX}
        y={labelY - 14}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-slate-600 text-[10px] italic select-none pointer-events-none"
      >
        {role}
      </text>
    )}
  </g>
)
