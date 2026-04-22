import { memo } from 'react'
import { getStraightPath, type EdgeProps } from '@xyflow/react'
import { useFloatingEdge } from '@/canvas/hooks/useFloatingEdge'
import { ISAEdgeGlyph } from '@/notation/chen/edges/ISAEdgeGlyph'
import { useDiagramStore } from '@/state/diagramStore'
import type { ISAEdge as ISAEdgeModel } from '@/domain/types'
import type { NotationEdgeData } from '@/notation/types'

export const ISAEdge = memo(({ source, target, data }: EdgeProps) => {
  const edgeId = (data as NotationEdgeData).edgeId
  const edge = useDiagramStore((s) => s.diagram.edgesById[edgeId]) as
    | ISAEdgeModel
    | undefined
  const float = useFloatingEdge(source, target)
  if (!edge || edge.kind !== 'isa-link' || !float) return null

  const [path] = getStraightPath({
    sourceX: float.sx,
    sourceY: float.sy,
    targetX: float.tx,
    targetY: float.ty,
  })

  return <ISAEdgeGlyph path={path} role={edge.role} />
})
ISAEdge.displayName = 'ISAEdge'
