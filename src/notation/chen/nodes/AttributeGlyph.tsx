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
  const underlined = isKey || isDiscriminant
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
        style={isDiscriminant ? { textDecorationStyle: 'dashed' } : undefined}
        {...(underlined ? { textDecoration: 'underline' } : {})}
      >
        {name}
      </text>
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
