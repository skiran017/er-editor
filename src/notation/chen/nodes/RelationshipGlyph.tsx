export interface RelationshipGlyphProps {
  readonly name: string
  readonly isIdentifying: boolean
  readonly width: number
  readonly height: number
  readonly isSelected: boolean
  readonly warningSeverity: 'none' | 'warning' | 'error'
}

const OUTER_STROKE = 2
const INNER_OFFSET = 6

const diamondPoints = (w: number, h: number, inset = 0): string => {
  const cx = w / 2
  const cy = h / 2
  const halfW = cx - inset
  const halfH = cy - inset
  return `${cx},${cy - halfH} ${cx + halfW},${cy} ${cx},${cy + halfH} ${cx - halfW},${cy}`
}

export const RelationshipGlyph = ({
  name,
  isIdentifying,
  width,
  height,
  isSelected,
  warningSeverity,
}: RelationshipGlyphProps) => (
  <g data-kind="relationship" data-selected={isSelected || undefined}>
    <polygon
      points={diamondPoints(width, height)}
      className={`fill-white ${isSelected ? 'stroke-blue-500' : 'stroke-slate-800'}`}
      strokeWidth={OUTER_STROKE}
    />
    {isIdentifying && (
      <polygon
        points={diamondPoints(width, height, INNER_OFFSET)}
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
    {warningSeverity !== 'none' && (
      <circle
        cx={width - 6}
        cy={6}
        r={5}
        data-role="warning-badge"
        className={warningSeverity === 'error' ? 'fill-red-500' : 'fill-amber-400'}
      />
    )}
  </g>
)
