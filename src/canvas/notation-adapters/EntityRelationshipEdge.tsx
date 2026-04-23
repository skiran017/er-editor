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
// * Total participation → draw a thicker dark stroke along the main path,
//   then overlay the same path with a thin background-coloured stroke. The
//   overlay "cuts" a gap through the middle, reading as two parallel lines.
//   Works for any path geometry (straight, L-bend, Z-bend, vertical, …) —
//   a geometric offset path was brittle because a single translate can't
//   offset both horizontal and vertical segments perpendicular to themselves.
// * Cardinality "1" → solid filled triangle at the ENTITY end, pointing
//   INTO the entity along the approach direction (perpendicular to the
//   entity side, NOT the centre-to-centre direction).
//
// Edge convention: for entity-relationship edges, source = entity and
// target = relationship (normalised by connectViaConnectTool), so the
// entity end is the SOURCE end.
const ARROW_LENGTH = 10
const ARROW_HALF_WIDTH = 5
// React Flow draws the edges SVG layer beneath the nodes layer, so anything
// drawn exactly on a node boundary gets clipped by the node's 2px stroke
// (and the filled rectangle behind it if the geometry strays inside). Push
// the arrow tip this many pixels outward along the approach direction so
// the entire triangle sits in clear canvas space.
const ARROW_TIP_GAP = 3
const CORNER_RADIUS = 5
const STROKE = '#334155'
const STROKE_WIDTH = 1.5
// Total-participation rendering: outer stroke width minus inner gap = each
// of the two visible lines is (TOTAL_OUTER - TOTAL_GAP) / 2 wide.
const TOTAL_OUTER_WIDTH = 5
const TOTAL_GAP_WIDTH = 2
const CANVAS_BG = 'white'

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
    const float = useFloatingEdge(source, target, edgeId)
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

    const isTotal = edge.participation === 'total'

    // Solid triangle arrowhead at the entity (source) end when cardinality = 1.
    // Tip is pushed ARROW_TIP_GAP pixels outside the entity boundary so it
    // clears the entity's 2px stroke (and doesn't risk being hidden by the
    // node body when the two nodes are close together). Body extends OUTward
    // from there.
    const showArrow = edge.cardinality === '1'
    let arrowPath: string | null = null
    if (showArrow) {
      const [ax, ay] = AWAY_DIR[srcSide]
      // Perpendicular to the approach direction for the base wings.
      const px = -ay
      const py = ax
      const tipX = sx + ax * ARROW_TIP_GAP
      const tipY = sy + ay * ARROW_TIP_GAP
      const baseCx = tipX + ax * ARROW_LENGTH
      const baseCy = tipY + ay * ARROW_LENGTH
      const b1x = baseCx + px * ARROW_HALF_WIDTH
      const b1y = baseCy + py * ARROW_HALF_WIDTH
      const b2x = baseCx - px * ARROW_HALF_WIDTH
      const b2y = baseCy - py * ARROW_HALF_WIDTH
      arrowPath = `M ${tipX} ${tipY} L ${b1x} ${b1y} L ${b2x} ${b2y} Z`
    }

    return (
      <>
        {/* Main path. For total participation we render a thicker dark
            stroke so the subsequent white-gap overlay can carve out the
            middle; for partial we render the plain thin stroke. */}
        <BaseEdge
          id={id}
          path={path}
          style={{
            stroke: STROKE,
            strokeWidth: isTotal ? TOTAL_OUTER_WIDTH : STROKE_WIDTH,
            fill: 'none',
          }}
        />
        {isTotal && (
          <path
            d={path}
            data-role="total-participation"
            stroke={CANVAS_BG}
            strokeWidth={TOTAL_GAP_WIDTH}
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
