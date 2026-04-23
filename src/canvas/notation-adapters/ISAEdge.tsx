import { memo } from 'react'
import { BaseEdge, getSmoothStepPath, Position, type EdgeProps } from '@xyflow/react'
import { useFloatingEdge, type EdgePosition } from '@/canvas/hooks/useFloatingEdge'
import { useDiagramStore } from '@/state/diagramStore'
import type { ISAEdge as ISAEdgeModel, ISANode } from '@/domain/types'
import type { NotationEdgeData } from '@/notation/types'

// Chen "total generalization": the parent→ISA line is drawn as a DOUBLE line
// (two parallel strokes). Achieved by stroke-in-stroke — thick dark under,
// thin canvas-background overlay carves out the middle. Works across straight
// and curved paths. Child edges always render as a single line regardless of
// the ISA's isTotal flag; the marker lives on the parent leg only.
const STROKE_WIDTH = 1.5
const TOTAL_OUTER_WIDTH = 5
const TOTAL_GAP_WIDTH = 2
const CORNER_RADIUS = 5

const POSITION_MAP: Record<EdgePosition, Position> = {
  top: Position.Top,
  right: Position.Right,
  bottom: Position.Bottom,
  left: Position.Left,
}

// Fallbacks for the first render frame before useFloatingEdge has resolved
// real ports — mirror the default handle geometry from diagramToRf.
const FALLBACK_SOURCE_POS: EdgePosition = 'right'
const FALLBACK_TARGET_POS: EdgePosition = 'left'

interface EdgeShape {
  readonly sx: number
  readonly sy: number
  readonly tx: number
  readonly ty: number
  readonly srcSide: EdgePosition
  readonly tgtSide: EdgePosition
}

const shapeFromFloat = (
  float: ReturnType<typeof useFloatingEdge>,
  fallback: EdgeShape,
): EdgeShape =>
  float
    ? { sx: float.sx, sy: float.sy, tx: float.tx, ty: float.ty,
        srcSide: float.sourcePosition, tgtSide: float.targetPosition }
    : fallback

const isTotalParentEdge = (
  edge: ISAEdgeModel,
  isaNode: ISANode | undefined,
): boolean =>
  edge.role === 'parent' && isaNode?.kind === 'isa' && isaNode.isTotal === true

export const ISAEdge = memo(
  ({ id, source, target, sourceX, sourceY, targetX, targetY, data }: EdgeProps) => {
    const edgeId = (data as NotationEdgeData).edgeId
    const edge = useDiagramStore((s) => s.diagram.edgesById[edgeId]) as
      | ISAEdgeModel
      | undefined

    // The ISA sits on the parent edge's TARGET end (parent → ISA) and on the
    // child edge's SOURCE end (ISA → child). Resolve its id accordingly so
    // we can read its isTotal flag — which only applies to the parent leg.
    const isaId = edge
      ? (edge.role === 'parent' ? edge.targetId : edge.sourceId)
      : null
    const isaNode = useDiagramStore((s) => (isaId ? s.diagram.nodesById[isaId] : undefined)) as
      | ISANode
      | undefined

    const float = useFloatingEdge(source, target, edgeId)
    if (!edge || edge.kind !== 'isa-link') return null

    const { sx, sy, tx, ty, srcSide, tgtSide } = shapeFromFloat(float, {
      sx: sourceX, sy: sourceY, tx: targetX, ty: targetY,
      srcSide: FALLBACK_SOURCE_POS, tgtSide: FALLBACK_TARGET_POS,
    })

    // Orthogonal routing — right-angle segments with a small corner radius.
    // `sourcePosition` / `targetPosition` tell RF which direction each end
    // enters/exits perpendicular to, so the bends read cleanly even when the
    // ISA's parent is above and a child is far off to the side.
    const [path] = getSmoothStepPath({
      sourceX: sx, sourceY: sy, sourcePosition: POSITION_MAP[srcSide],
      targetX: tx, targetY: ty, targetPosition: POSITION_MAP[tgtSide],
      borderRadius: CORNER_RADIUS,
    })

    const drawDouble = isTotalParentEdge(edge, isaNode)

    return (
      <>
        <BaseEdge
          id={id}
          path={path}
          data-role={edge.role}
          style={{
            stroke: 'var(--er-edge-stroke)',
            strokeWidth: drawDouble ? TOTAL_OUTER_WIDTH : STROKE_WIDTH,
            fill: 'none',
          }}
        />
        {drawDouble && (
          <path
            d={path}
            data-role="total-generalization"
            stroke="var(--er-canvas-bg)"
            strokeWidth={TOTAL_GAP_WIDTH}
            fill="none"
            pointerEvents="none"
          />
        )}
      </>
    )
  },
)
ISAEdge.displayName = 'ISAEdge'
