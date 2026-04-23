import { memo } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { AttributeGlyph } from '@/notation/chen/nodes/AttributeGlyph'
import { useDiagramStore } from '@/state/diagramStore'
import { useSelectionStore } from '@/state/selectionStore'
import { useValidationStore } from '@/state/validationStore'
import { pickSeverity } from '@/state/selectors'
import type { AttributeNode as AttributeNodeModel } from '@/domain/types'
import type { NotationNodeData } from '@/notation/types'

type AttributeRfNode = Node<NotationNodeData, 'attribute'>

export const AttributeNode = memo(({ data }: NodeProps<AttributeRfNode>) => {
  const nodeId = data.nodeId
  const node = useDiagramStore((s) => s.diagram.nodesById[nodeId]) as
    | AttributeNodeModel
    | undefined
  const isSelected = useSelectionStore((s) => s.selectedNodeIds.has(nodeId))
  const warnings = useValidationStore((s) => s.errorsById[nodeId])
  if (!node || node.kind !== 'attribute') return null
  return (
    <>
      <Handle
        type="source"
        position={Position.Right}
        id="src"
        style={{ opacity: 0, background: 'transparent', border: 'none', width: 1, height: 1 }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="tgt"
        style={{ opacity: 0, background: 'transparent', border: 'none', width: 1, height: 1 }}
      />
      <svg width={node.size.width} height={node.size.height} overflow="visible">
        <AttributeGlyph
          name={node.name}
          isKey={node.isKey}
          isDiscriminant={node.isDiscriminant}
          isMultivalued={node.isMultivalued}
          isDerived={node.isDerived}
          isComposite={node.isComposite}
          width={node.size.width}
          height={node.size.height}
          isSelected={isSelected}
          warningSeverity={pickSeverity(warnings)}
        />
      </svg>
    </>
  )
})
AttributeNode.displayName = 'AttributeNode'
