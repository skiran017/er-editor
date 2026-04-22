import type { Cardinality, Participation } from '@/domain/types'

export interface CardinalityLabelProps {
  readonly cardinality: Cardinality
  readonly participation: Participation
  readonly x: number
  readonly y: number
}

export const CardinalityLabel = ({
  cardinality,
  participation,
  x,
  y,
}: CardinalityLabelProps) => (
  <g data-role="cardinality-label" transform={`translate(${x}, ${y})`}>
    <text
      x={0}
      y={0}
      textAnchor="middle"
      dominantBaseline="central"
      className="fill-slate-800 text-xs font-semibold select-none pointer-events-none"
    >
      {cardinality}
    </text>
    <circle
      cx={10}
      cy={0}
      r={3}
      data-role="participation-marker"
      data-participation={participation}
      fill={participation === 'total' ? 'currentColor' : 'white'}
      className="stroke-slate-800"
      strokeWidth={1}
    />
  </g>
)
