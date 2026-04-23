import { memo } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { EntityGlyph } from '@/notation/chen/nodes/EntityGlyph'
import { useDiagramStore } from '@/state/diagramStore'
import { useSelectionStore } from '@/state/selectionStore'
import { useValidationForId } from '@/canvas/hooks/useValidationForId'
import type { EntityNode as EntityNodeModel } from '@/domain/types'
import type { NotationNodeData } from '@/notation/types'

type EntityRfNode = Node<NotationNodeData, 'entity'>

export const EntityNode = memo(({ data }: NodeProps<EntityRfNode>) => {
  const nodeId = data.nodeId
  const node = useDiagramStore((s) => s.diagram.nodesById[nodeId]) as
    | EntityNodeModel
    | undefined
  const isSelected = useSelectionStore((s) => s.selectedNodeIds.has(nodeId))
  const validation = useValidationForId(nodeId)
  if (!node || node.kind !== 'entity') return null
  // Wrap in a sized <div> so React Flow's ResizeObserver can measure the
  // node (RF v12 error #015: node not initialized). A fragment-with-SVG has
  // no measurable block-level element, so RF never marks the node as
  // initialized — which breaks drag AND edge attachment.
  return (
    <div style={{ width: node.size.width, height: node.size.height, position: 'relative' }}>
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
        <EntityGlyph
          name={node.name}
          isWeak={node.isWeak}
          width={node.size.width}
          height={node.size.height}
          isSelected={isSelected}
          warningSeverity={validation.severity}
          warningMessages={validation.messages}
        />
      </svg>
    </div>
  )
})
EntityNode.displayName = 'EntityNode'
