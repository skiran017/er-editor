import { memo } from 'react'
import { getStraightPath, type EdgeProps } from '@xyflow/react'
import { ISAEdgeGlyph } from '@/notation/chen/edges/ISAEdgeGlyph'
import { useDiagramStore } from '@/state/diagramStore'
import type { ISAEdge as ISAEdgeModel } from '@/domain/types'
import type { NotationEdgeData } from '@/notation/types'

export const ISAEdge = memo(
  ({ sourceX, sourceY, targetX, targetY, data }: EdgeProps) => {
    const edgeId = (data as NotationEdgeData).edgeId
    const edge = useDiagramStore((s) => s.diagram.edgesById[edgeId]) as
      | ISAEdgeModel
      | undefined
    if (!edge || edge.kind !== 'isa-link') return null

    const [path] = getStraightPath({ sourceX, sourceY, targetX, targetY })

    return <ISAEdgeGlyph path={path} role={edge.role} />
  },
)
ISAEdge.displayName = 'ISAEdge'
