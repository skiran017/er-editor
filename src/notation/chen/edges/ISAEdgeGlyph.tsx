export interface ISAEdgeGlyphProps {
  readonly path: string
  readonly role: 'parent' | 'child'
}

export const ISAEdgeGlyph = ({ path, role }: ISAEdgeGlyphProps) => (
  <g data-kind="isa-link" data-role={role}>
    <path d={path} className="fill-none stroke-slate-700" strokeWidth={1.5} />
  </g>
)
