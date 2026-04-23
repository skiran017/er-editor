import { memo, type MouseEvent as ReactMouseEvent } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { ISAGlyph } from '@/notation/chen/nodes/ISAGlyph'
import { useDiagramStore } from '@/state/diagramStore'
import { useSelectionStore } from '@/state/selectionStore'
import { useValidationStore } from '@/state/validationStore'
import { useUiStore } from '@/state/uiStore'
import { useInteractionStore } from '@/interaction/interactionStore'
import { pickSeverity } from '@/state/selectors'
import type { ISANode as ISANodeModel } from '@/domain/types'
import type { NotationNodeData } from '@/notation/types'

type ISARfNode = Node<NotationNodeData, 'isa'>

export const ISANode = memo(({ data }: NodeProps<ISARfNode>) => {
  const nodeId = data.nodeId
  const node = useDiagramStore((s) => s.diagram.nodesById[nodeId]) as ISANodeModel | undefined
  const isSelected = useSelectionStore((s) => s.selectedNodeIds.has(nodeId))
  const warnings = useValidationStore((s) => s.errorsById[nodeId])

  const handleContextMenu = (e: ReactMouseEvent<SVGSVGElement>): void => {
    e.preventDefault()
    e.stopPropagation()
    useUiStore.getState().openContextMenu({
      at: { x: e.clientX, y: e.clientY },
      items: [{
        id: 'add-child',
        labelKey: 'menu:isa.addChild',
        onSelect: () => {
          useInteractionStore.getState().send({ type: 'CONNECT_CHILD_TO_ISA', isaId: nodeId })
        },
      }],
    })
  }

  if (!node || node.kind !== 'isa') return null
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
      <svg
        width={node.size.width}
        height={node.size.height}
        overflow="visible"
        onContextMenu={handleContextMenu}
      >
        <ISAGlyph
          isTotal={node.isTotal}
          width={node.size.width}
          height={node.size.height}
          isSelected={isSelected}
          warningSeverity={pickSeverity(warnings)}
        />
      </svg>
    </>
  )
})
ISANode.displayName = 'ISANode'
