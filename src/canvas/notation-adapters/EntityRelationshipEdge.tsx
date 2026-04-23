import { memo } from 'react'
import { BaseEdge, getSmoothStepPath, Position, type EdgeProps } from '@xyflow/react'
import { useFloatingEdge, type EdgePosition } from '@/canvas/hooks/useFloatingEdge'
import { useDiagramStore } from '@/state/diagramStore'
import type { EntityRelationshipEdge as EREdgeModel } from '@/domain/types'
import type { NotationEdgeData } from '@/notation/types'

// Chen visual rules (ported from legacy ConnectionShape.tsx):
// * Orthogonal routing via getSmoothStepPath — axis-aligned segments with a
//   small corner radius. Lines enter each node perpendicular to the side
//   computed by useFloatingEdge.
// * Total participation → a second smoothstep path offset perpendicular to
//   each endpoint's outward direction (reads as a "double line" near both
//   ends even though the middle segments can be farther apart).
// * Cardinality "1" → solid filled triangle at the ENTITY end, pointing
//   INTO the entity along the approach direction (perpendicular to the
//   entity side, NOT the centre-to-centre direction).
//
// Edge convention: for entity-relationship edges, source = entity and
// target = relationship (normalised by connectViaConnectTool), so the
// entity end is the SOURCE end.
const PARALLEL_OFFSET = 4
const ARROW_LENGTH = 10
const ARROW_HALF_WIDTH = 5
const CORNER_RADIUS = 5
const STROKE = '#334155'
const STROKE_WIDTH = 1.5

// The direction pointing OUT of the node along the side the edge exits.
// sourcePosition === 'right' means the edge leaves the node from its right
// edge → outward direction is +x.
const AWAY_DIR: Record<EdgePosition, readonly [number, number]> = {
  top: [0, -1],
  right: [1, 0],
  bottom: [0, 1],
  left: [-1, 0],
}

const POSITION_MAP: Record<EdgePosition, Position> = {
  top: Position.Top,
  right: Position.Right,
  bottom: Position.Bottom,
  left: Position.Left,
}

// Fallback used when `useFloatingEdge` hasn't resolved yet (first render
// before measurement) — source on the right, target on the left mirrors
// the handle geometry from diagramToRf.
const FALLBACK_SOURCE_POS: EdgePosition = 'right'
const FALLBACK_TARGET_POS: EdgePosition = 'left'

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
    const srcSide: EdgePosition = float ? float.sourcePosition : FALLBACK_SOURCE_POS
    const tgtSide: EdgePosition = float ? float.targetPosition : FALLBACK_TARGET_POS
    const sourcePosition = POSITION_MAP[srcSide]
    const targetPosition = POSITION_MAP[tgtSide]

    const [path, labelX, labelY] = getSmoothStepPath({
      sourceX: sx, sourceY: sy, sourcePosition,
      targetX: tx, targetY: ty, targetPosition,
      borderRadius: CORNER_RADIUS,
    })

    // Parallel orthogonal path for total participation. Render the SAME
    // smoothstep path, translated by one consistent offset perpendicular to
    // the overall source→target displacement — using per-endpoint
    // perpendiculars (my first attempt) sent the two endpoints into
    // different axes on L-shaped routes and made the parallel elbows
    // cross the primary ones.
    let parallelPath: string | null = null
    let parallelTransform = ''
    if (edge.participation === 'total') {
      const dx = tx - sx
      const dy = ty - sy
      const len = Math.hypot(dx, dy) || 1
      // 90° clockwise rotation of the unit displacement vector.
      const offX = (dy / len) * PARALLEL_OFFSET
      const offY = -(dx / len) * PARALLEL_OFFSET
      parallelPath = path
      parallelTransform = `translate(${offX}, ${offY})`
    }

    // Solid triangle arrowhead at the entity (source) end when cardinality = 1.
    // Tip at (sx, sy) on the entity boundary; body extends OUTward along the
    // entity side's outward direction (so the arrow points inward).
    const showArrow = edge.cardinality === '1'
    let arrowPath: string | null = null
    if (showArrow) {
      const [ax, ay] = AWAY_DIR[srcSide]
      // Perpendicular to the approach direction for the base wings.
      const px = -ay
      const py = ax
      const baseCx = sx + ax * ARROW_LENGTH
      const baseCy = sy + ay * ARROW_LENGTH
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
            transform={parallelTransform}
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
