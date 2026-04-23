import { memo } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { RelationshipGlyph } from '@/notation/chen/nodes/RelationshipGlyph'
import { useDiagramStore } from '@/state/diagramStore'
import { useSelectionStore } from '@/state/selectionStore'
import { useValidationStore } from '@/state/validationStore'
import { pickSeverity } from '@/state/selectors'
import type { RelationshipNode as RelationshipNodeModel } from '@/domain/types'
import type { NotationNodeData } from '@/notation/types'

type RelationshipRfNode = Node<NotationNodeData, 'relationship'>

export const RelationshipNode = memo(({ data }: NodeProps<RelationshipRfNode>) => {
  const nodeId = data.nodeId
  const node = useDiagramStore((s) => s.diagram.nodesById[nodeId]) as
    | RelationshipNodeModel
    | undefined
  const isSelected = useSelectionStore((s) => s.selectedNodeIds.has(nodeId))
  const warnings = useValidationStore((s) => s.errorsById[nodeId])
  if (!node || node.kind !== 'relationship') return null
  return (
    <>
      <Handle
        type="source"
        position={Position.Top}
        id="src"
        style={{ opacity: 0, pointerEvents: 'none' }}
        isConnectable={false}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="tgt"
        style={{ opacity: 0, pointerEvents: 'none' }}
        isConnectable={false}
      />
      <svg width={node.size.width} height={node.size.height} overflow="visible">
        <RelationshipGlyph
          name={node.name}
          isIdentifying={node.isIdentifying}
          width={node.size.width}
          height={node.size.height}
          isSelected={isSelected}
          warningSeverity={pickSeverity(warnings)}
        />
      </svg>
    </>
  )
})
RelationshipNode.displayName = 'RelationshipNode'
