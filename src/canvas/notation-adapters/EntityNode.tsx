import { memo } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { EntityGlyph } from '@/notation/chen/nodes/EntityGlyph'
import { useDiagramStore } from '@/state/diagramStore'
import { useSelectionStore } from '@/state/selectionStore'
import { useValidationStore } from '@/state/validationStore'
import { pickSeverity } from '@/state/selectors'
import type { EntityNode as EntityNodeModel } from '@/domain/types'
import type { NotationNodeData } from '@/notation/types'

type EntityRfNode = Node<NotationNodeData, 'entity'>

export const EntityNode = memo(({ data }: NodeProps<EntityRfNode>) => {
  const nodeId = data.nodeId
  const node = useDiagramStore((s) => s.diagram.nodesById[nodeId]) as
    | EntityNodeModel
    | undefined
  const isSelected = useSelectionStore((s) => s.selectedNodeIds.has(nodeId))
  const warnings = useValidationStore((s) => s.errorsById[nodeId])
  if (!node || node.kind !== 'entity') return null
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
        <EntityGlyph
          name={node.name}
          isWeak={node.isWeak}
          width={node.size.width}
          height={node.size.height}
          isSelected={isSelected}
          warningSeverity={pickSeverity(warnings)}
        />
      </svg>
    </>
  )
})
EntityNode.displayName = 'EntityNode'
