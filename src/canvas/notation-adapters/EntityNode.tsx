import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { EntityGlyph } from '@/notation/chen/nodes/EntityGlyph'
import { useDiagramStore } from '@/state/diagramStore'
import { useSelectionStore } from '@/state/selectionStore'
import { useValidationStore } from '@/state/validationStore'
import type { EntityNode as EntityNodeModel, NodeId } from '@/domain/types'
import type { NotationNodeData } from '@/notation/types'

const pickSeverity = (
  errors?: readonly { severity: 'error' | 'warning' }[],
): 'none' | 'warning' | 'error' => {
  if (!errors || errors.length === 0) return 'none'
  return errors.some((e) => e.severity === 'error') ? 'error' : 'warning'
}

export const EntityNode = memo(({ data }: NodeProps) => {
  const nodeId = (data as unknown as NotationNodeData).nodeId
  const node = useDiagramStore((s) => s.diagram.nodesById[nodeId]) as
    | EntityNodeModel
    | undefined
  const isSelected = useSelectionStore((s) => s.selectedNodeIds.has(nodeId))
  const warnings = useValidationStore((s) => s.errorsById[nodeId as NodeId])
  if (!node || node.kind !== 'entity') return null
  return (
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
  )
})
EntityNode.displayName = 'EntityNode'
