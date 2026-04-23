import { ValidationBadge } from './ValidationBadge'

export interface EntityGlyphProps {
  readonly name: string
  readonly isWeak: boolean
  readonly width: number
  readonly height: number
  readonly isSelected: boolean
  readonly warningSeverity: 'none' | 'warning' | 'error'
  readonly warningMessages?: readonly string[]
}

const OUTER_STROKE = 2
const INNER_OFFSET = 4

export const EntityGlyph = ({
  name,
  isWeak,
  width,
  height,
  isSelected,
  warningSeverity,
  warningMessages,
}: EntityGlyphProps) => (
  <g data-kind="entity" data-selected={isSelected || undefined}>
    <rect
      x={0}
      y={0}
      width={width}
      height={height}
      rx={4}
      ry={4}
      className={`fill-white ${isSelected ? 'stroke-blue-500' : 'stroke-slate-800'}`}
      strokeWidth={OUTER_STROKE}
    />
    {isWeak && (
      <rect
        x={INNER_OFFSET}
        y={INNER_OFFSET}
        width={width - INNER_OFFSET * 2}
        height={height - INNER_OFFSET * 2}
        rx={2}
        ry={2}
        className={`fill-none ${isSelected ? 'stroke-blue-500' : 'stroke-slate-800'}`}
        strokeWidth={OUTER_STROKE}
      />
    )}
    <text
      x={width / 2}
      y={height / 2}
      textAnchor="middle"
      dominantBaseline="central"
      className="fill-slate-900 text-sm font-medium select-none pointer-events-none"
    >
      {name}
    </text>
    <ValidationBadge
      severity={warningSeverity}
      cx={width - 6}
      cy={6}
      messages={warningMessages}
    />
  </g>
)
