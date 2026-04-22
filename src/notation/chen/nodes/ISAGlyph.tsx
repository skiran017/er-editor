export interface ISAGlyphProps {
  readonly isTotal: boolean
  readonly width: number
  readonly height: number
  readonly isSelected: boolean
  readonly warningSeverity: 'none' | 'warning' | 'error'
}

const OUTER_STROKE = 2
const INNER_OFFSET = 5

const trianglePoints = (w: number, h: number, inset = 0): string => {
  // Top-down triangle: top-left, top-right, bottom-centre.
  const cx = w / 2
  const topY = inset
  const botY = h - inset
  const leftX = inset
  const rightX = w - inset
  return `${leftX},${topY} ${rightX},${topY} ${cx},${botY}`
}

export const ISAGlyph = ({
  isTotal,
  width,
  height,
  isSelected,
  warningSeverity,
}: ISAGlyphProps) => (
  <g data-kind="isa" data-selected={isSelected || undefined}>
    <polygon
      points={trianglePoints(width, height)}
      className={`fill-white ${isSelected ? 'stroke-blue-500' : 'stroke-slate-800'}`}
      strokeWidth={OUTER_STROKE}
    />
    {isTotal && (
      <polygon
        points={trianglePoints(width, height, INNER_OFFSET)}
        className={`fill-none ${isSelected ? 'stroke-blue-500' : 'stroke-slate-800'}`}
        strokeWidth={OUTER_STROKE}
      />
    )}
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
