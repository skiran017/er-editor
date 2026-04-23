export interface AttributeGlyphProps {
  readonly name: string
  readonly isKey: boolean
  readonly isDiscriminant: boolean
  readonly isMultivalued: boolean
  readonly isDerived: boolean
  readonly isComposite: boolean
  readonly width: number
  readonly height: number
  readonly isSelected: boolean
  readonly warningSeverity: 'none' | 'warning' | 'error'
}

const OUTER_STROKE = 2
const INNER_OFFSET = 4
const DASHED = '4 3'

export const AttributeGlyph = ({
  name,
  isKey,
  isDiscriminant,
  isMultivalued,
  isDerived,
  isComposite,
  width,
  height,
  isSelected,
  warningSeverity,
}: AttributeGlyphProps) => {
  const rx = width / 2
  const ry = height / 2
  const strokeClass = isSelected ? 'stroke-blue-500' : 'stroke-slate-800'
  // Bug 6 — SVG <text> does NOT reliably honour `text-decoration-style: dashed`
  // (especially in Safari). Draw an explicit dashed <line> under the text for
  // the discriminant (partial-key) case. Solid underline for key attributes
  // still uses the cross-browser `text-decoration="underline"` attribute.
  const approxTextWidth = Math.min(Math.max(name.length * 5.5, 10), Math.max(0, width - 20))
  return (
    <g data-kind="attribute" data-selected={isSelected || undefined}>
      <ellipse
        data-role="outline"
        cx={rx}
        cy={ry}
        rx={Math.max(0, rx - 1)}
        ry={Math.max(0, ry - 1)}
        className={`fill-white ${strokeClass}`}
        strokeWidth={OUTER_STROKE}
        strokeDasharray={isDerived ? DASHED : undefined}
      />
      {isMultivalued && (
        <ellipse
          data-role="multivalued-inner"
          cx={rx}
          cy={ry}
          rx={Math.max(0, rx - 1 - INNER_OFFSET)}
          ry={Math.max(0, ry - 1 - INNER_OFFSET)}
          className={`fill-none ${strokeClass}`}
          strokeWidth={OUTER_STROKE}
          strokeDasharray={isDerived ? DASHED : undefined}
        />
      )}
      <text
        x={rx}
        y={ry}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-slate-900 text-xs select-none pointer-events-none"
        data-discriminant={isDiscriminant ? 'true' : undefined}
        {...(isKey ? { textDecoration: 'underline' } : {})}
      >
        {name}
      </text>
      {isDiscriminant && (
        <line
          data-role="discriminant-underline"
          x1={rx - approxTextWidth / 2}
          y1={ry + 8}
          x2={rx + approxTextWidth / 2}
          y2={ry + 8}
          stroke="currentColor"
          strokeWidth={1}
          strokeDasharray="3 2"
          className="text-slate-900"
        />
      )}
      {isComposite && (
        <polygon
          data-role="composite-marker"
          points={`${width - 10},6 ${width - 4},6 ${width - 7},12`}
          className="fill-slate-700"
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
}
