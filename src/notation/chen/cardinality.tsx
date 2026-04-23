import type { Cardinality, Participation } from '@/domain/types'

export interface CardinalityLabelProps {
  readonly cardinality: Cardinality
  /**
   * Kept in the API so consumers don't need restructuring, but participation
   * is communicated visually by the double parallel line (drawn by the edge
   * component). No separate marker is rendered here.
   */
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
  <g
    data-role="cardinality-label"
    data-participation={participation}
    transform={`translate(${x}, ${y})`}
  >
    {/* Light pill backdrop so the label is legible over the line crossing. */}
    <rect
      x={-10}
      y={-8}
      width={20}
      height={16}
      rx={3}
      fill="white"
      fillOpacity={0.85}
      pointerEvents="none"
    />
    <text
      x={0}
      y={0}
      textAnchor="middle"
      dominantBaseline="central"
      className="fill-slate-800 text-xs font-semibold select-none pointer-events-none"
    >
      {cardinality}
    </text>
  </g>
)
