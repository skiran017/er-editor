export interface AttributeEdgeGlyphProps {
  readonly path: string
}

export const AttributeEdgeGlyph = ({ path }: AttributeEdgeGlyphProps) => (
  <g data-kind="attribute-of">
    <path d={path} className="fill-none stroke-slate-600" strokeWidth={1.5} />
  </g>
)
