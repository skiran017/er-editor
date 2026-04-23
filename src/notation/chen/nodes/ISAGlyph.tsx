import { ValidationBadge } from './ValidationBadge'

export interface ISAGlyphProps {
  // `isTotal` is read by the EDGE (parent→ISA) for its double-line marker,
  // not by the glyph — the triangle itself is the same shape either way.
  // Kept in the glyph prop shape so adapters can forward the domain field
  // without branching.
  readonly isTotal: boolean
  readonly width: number
  readonly height: number
  readonly isSelected: boolean
  readonly warningSeverity: 'none' | 'warning' | 'error'
  readonly warningMessages?: readonly string[]
}

const OUTER_STROKE = 2

// Inverted triangle: base along the TOP edge, apex at the bottom-centre.
// The parent-edge connects to the top-midpoint (centre of the base); every
// child-edge exits from the bottom apex. useFloatingEdge forces those ports
// by edge role, so the geometry here just needs to match the port anchors.
const trianglePoints = (w: number, h: number): string => {
  const cx = w / 2
  return `0,0 ${w},0 ${cx},${h}`
}

export const ISAGlyph = ({
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
    {/* "ISA" label sat at the centroid (y ≈ h/3) — the widest part of the
        inverted triangle, where it has room horizontally. dominantBaseline
        keeps it vertically centred on that y-line regardless of font size. */}
    <text
      x={width / 2}
      y={height / 3}
      textAnchor="middle"
      dominantBaseline="central"
      className="fill-slate-900 text-xs font-semibold tracking-wide select-none pointer-events-none dark:fill-slate-100"
    >
      ISA
    </text>
    <ValidationBadge
      severity={warningSeverity}
      cx={width - 6}
      cy={6}
      messages={warningMessages}
    />
  </g>
)
