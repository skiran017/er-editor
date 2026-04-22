import type { ReactElement } from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { ReactFlowProvider, type Node, type NodeProps } from '@xyflow/react'
import { RelationshipNode } from './RelationshipNode'
import { useDiagramStore } from '@/state/diagramStore'
import { useSelectionStore } from '@/state/selectionStore'
import { useValidationStore } from '@/state/validationStore'
import { emptyDiagram, type NodeId } from '@/domain/types'
import type { NotationNodeData } from '@/notation/types'

type RelationshipRfNode = Node<NotationNodeData, 'relationship'>

const resetStores = () => {
  useDiagramStore.setState({ diagram: emptyDiagram() })
  useDiagramStore.temporal.getState().clear()
  useSelectionStore.setState({
    selectedNodeIds: new Set(),
    selectedEdgeIds: new Set(),
    rubberband: null,
  })
  useValidationStore.setState({ errorsById: {}, enabled: true })
}

const mkNodeProps = (id: NodeId) =>
  ({ id, data: { nodeId: id }, type: 'relationship' }) as unknown as NodeProps<RelationshipRfNode>

const renderWithProvider = (ui: ReactElement) =>
  render(
    <ReactFlowProvider>
      <svg>{ui}</svg>
    </ReactFlowProvider>,
  )

describe('RelationshipNode container', () => {
  beforeEach(resetStores)

  it('renders identifying relationship with double diamond', () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'relationship',
      name: 'owns',
      isIdentifying: true,
      position: { x: 0, y: 0 },
      size: { width: 140, height: 70 },
    })
    const { container } = renderWithProvider(<RelationshipNode {...mkNodeProps(id)} />)
    expect(container.querySelectorAll('polygon').length).toBe(2)
  })

  it('renders non-identifying relationship with single diamond', () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'relationship',
      name: 'likes',
      isIdentifying: false,
      position: { x: 0, y: 0 },
      size: { width: 140, height: 70 },
    })
    const { container, getByText } = renderWithProvider(
      <RelationshipNode {...mkNodeProps(id)} />,
    )
    expect(container.querySelectorAll('polygon').length).toBe(1)
    expect(getByText('likes')).toBeInTheDocument()
  })

  it('returns null when the stored node is not a relationship', () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'entity',
      name: 'X',
      isWeak: false,
      position: { x: 0, y: 0 },
      size: { width: 120, height: 60 },
    })
    const { container } = renderWithProvider(<RelationshipNode {...mkNodeProps(id)} />)
    expect(container.querySelector('[data-kind="relationship"]')).not.toBeInTheDocument()
  })
})
