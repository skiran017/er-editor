import { ValidationBadge } from './ValidationBadge'

export interface ISAGlyphProps {
  readonly isTotal: boolean
  readonly width: number
  readonly height: number
  readonly isSelected: boolean
  readonly warningSeverity: 'none' | 'warning' | 'error'
  readonly warningMessages?: readonly string[]
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
  warningMessages,
}: ISAGlyphProps) => (
  <g data-kind="isa" data-selected={isSelected || undefined}>
    <polygon
      points={trianglePoints(width, height)}
      className={`fill-white dark:fill-slate-800 ${isSelected ? 'stroke-blue-500' : 'stroke-slate-800 dark:stroke-slate-200'}`}
      strokeWidth={OUTER_STROKE}
    />
    {isTotal && (
      <polygon
        points={trianglePoints(width, height, INNER_OFFSET)}
        className={`fill-none ${isSelected ? 'stroke-blue-500' : 'stroke-slate-800 dark:stroke-slate-200'}`}
        strokeWidth={OUTER_STROKE}
      />
    )}
    <ValidationBadge
      severity={warningSeverity}
      cx={width - 6}
      cy={6}
      messages={warningMessages}
    />
  </g>
)
