import { memo } from 'react'
import { BaseEdge, getStraightPath, type EdgeProps } from '@xyflow/react'
import { useFloatingEdge } from '@/canvas/hooks/useFloatingEdge'
import { useDiagramStore } from '@/state/diagramStore'
import type { EntityRelationshipEdge as EREdgeModel } from '@/domain/types'
import type { NotationEdgeData } from '@/notation/types'

// Chen visual rules ported from legacy ConnectionShape.tsx:
// * Total participation → a second line drawn parallel at +offset, NOT a
//   dashed single line. Legacy offsets along the perpendicular; we mirror.
// * Cardinality "1" → solid filled triangle at the ENTITY end, pointing
//   INTO the entity. No arrow for N or M.
// * Cardinality "N" / "M" → letter label at midpoint only.
//
// Edge convention: for entity-relationship edges, source = entity and
// target = relationship (normalised by connectViaConnectTool), so the
// entity end is the SOURCE end.
const PARALLEL_OFFSET = 4
const ARROW_LENGTH = 10
const ARROW_HALF_WIDTH = 5
const STROKE = '#334155'
const STROKE_WIDTH = 1.5

export const EntityRelationshipEdge = memo(
  ({
    id,
    source,
    target,
    sourceX,
    sourceY,
    targetX,
    targetY,
    data,
  }: EdgeProps) => {
    const edgeId = (data as NotationEdgeData).edgeId
    const edge = useDiagramStore((s) => s.diagram.edgesById[edgeId]) as
      | EREdgeModel
      | undefined
    const float = useFloatingEdge(source, target)
    if (!edge || edge.kind !== 'entity-relationship') return null

    const sx = float ? float.sx : sourceX
    const sy = float ? float.sy : sourceY
    const tx = float ? float.tx : targetX
    const ty = float ? float.ty : targetY

    const [path, labelX, labelY] = getStraightPath({
      sourceX: sx, sourceY: sy, targetX: tx, targetY: ty,
    })

    // Unit vector along the edge + perpendicular (for the parallel line and
    // arrowhead base points). Guard against zero-length edges.
    const dx = tx - sx
    const dy = ty - sy
    const len = Math.hypot(dx, dy) || 1
    const ux = dx / len
    const uy = dy / len
    const px = -uy
    const py = ux

    // Parallel line for total participation — offset along the perpendicular.
    const parallelPath =
      edge.participation === 'total'
        ? `M ${sx + px * PARALLEL_OFFSET} ${sy + py * PARALLEL_OFFSET} ` +
          `L ${tx + px * PARALLEL_OFFSET} ${ty + py * PARALLEL_OFFSET}`
        : null

    // Arrowhead at the entity (source) end when cardinality = 1.
    // Tip is at (sx, sy). Base is ARROW_LENGTH units along the edge (toward
    // the relationship, which is the target end), offset ±ARROW_HALF_WIDTH
    // perpendicular.
    const showArrow = edge.cardinality === '1'
    let arrowPath: string | null = null
    if (showArrow) {
      const baseCx = sx + ux * ARROW_LENGTH
      const baseCy = sy + uy * ARROW_LENGTH
      const b1x = baseCx + px * ARROW_HALF_WIDTH
      const b1y = baseCy + py * ARROW_HALF_WIDTH
      const b2x = baseCx - px * ARROW_HALF_WIDTH
      const b2y = baseCy - py * ARROW_HALF_WIDTH
      arrowPath = `M ${sx} ${sy} L ${b1x} ${b1y} L ${b2x} ${b2y} Z`
    }

    return (
      <>
        <BaseEdge
          id={id}
          path={path}
          style={{ stroke: STROKE, strokeWidth: STROKE_WIDTH, fill: 'none' }}
        />
        {parallelPath && (
          <path
            d={parallelPath}
            data-role="total-participation"
            stroke={STROKE}
            strokeWidth={STROKE_WIDTH}
            fill="none"
            pointerEvents="none"
          />
        )}
        {arrowPath && (
          <path
            d={arrowPath}
            data-role="cardinality-arrow"
            fill={STROKE}
            stroke={STROKE}
            strokeLinejoin="miter"
            pointerEvents="none"
          />
        )}
        {/* Cardinality letter labels intentionally omitted — cardinality is
            conveyed by the triangle arrowhead at the "1" end, participation
            by the parallel second line for total. Users can still edit both
            values from the property panel. */}
        {edge.role && (
          <text
            x={labelX}
            y={labelY - 14}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-slate-600 text-[10px] italic select-none pointer-events-none"
          >
            {edge.role}
          </text>
        )}
      </>
    )
  },
)
EntityRelationshipEdge.displayName = 'EntityRelationshipEdge'
