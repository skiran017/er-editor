import { memo } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import { ISAGlyph } from '@/notation/chen/nodes/ISAGlyph'
import { useDiagramStore } from '@/state/diagramStore'
import { useSelectionStore } from '@/state/selectionStore'
import { useValidationStore } from '@/state/validationStore'
import { pickSeverity } from '@/state/selectors'
import type { ISANode as ISANodeModel } from '@/domain/types'
import type { NotationNodeData } from '@/notation/types'

type ISARfNode = Node<NotationNodeData, 'isa'>

export const ISANode = memo(({ data }: NodeProps<ISARfNode>) => {
  const nodeId = data.nodeId
  const node = useDiagramStore((s) => s.diagram.nodesById[nodeId]) as ISANodeModel | undefined
  const isSelected = useSelectionStore((s) => s.selectedNodeIds.has(nodeId))
  const warnings = useValidationStore((s) => s.errorsById[nodeId])
  if (!node || node.kind !== 'isa') return null
  return (
    <svg width={node.size.width} height={node.size.height} overflow="visible">
      <ISAGlyph
        isTotal={node.isTotal}
        width={node.size.width}
        height={node.size.height}
        isSelected={isSelected}
        warningSeverity={pickSeverity(warnings)}
      />
    </svg>
  )
})
ISANode.displayName = 'ISANode'
