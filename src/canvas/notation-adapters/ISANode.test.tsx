import type { ReactElement } from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { ReactFlowProvider, type Node, type NodeProps } from '@xyflow/react'
import { ISANode } from './ISANode'
import { useDiagramStore } from '@/state/diagramStore'
import { useSelectionStore } from '@/state/selectionStore'
import { useValidationStore } from '@/state/validationStore'
import { emptyDiagram, type NodeId } from '@/domain/types'
import type { NotationNodeData } from '@/notation/types'

type ISARfNode = Node<NotationNodeData, 'isa'>

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
  ({ id, data: { nodeId: id }, type: 'isa' }) as unknown as NodeProps<ISARfNode>

const renderWithProvider = (ui: ReactElement) =>
  render(
    <ReactFlowProvider>
      <svg>{ui}</svg>
    </ReactFlowProvider>,
  )

describe('ISANode container', () => {
  beforeEach(resetStores)

  it('renders a total generalization with double triangle', () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'isa',
      isTotal: true,
      position: { x: 0, y: 0 },
      size: { width: 100, height: 60 },
    })
    const { container } = renderWithProvider(<ISANode {...mkNodeProps(id)} />)
    expect(container.querySelectorAll('polygon').length).toBe(2)
  })

  it('renders a partial generalization with single triangle', () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'isa',
      isTotal: false,
      position: { x: 0, y: 0 },
      size: { width: 100, height: 60 },
    })
    const { container } = renderWithProvider(<ISANode {...mkNodeProps(id)} />)
    expect(container.querySelectorAll('polygon').length).toBe(1)
  })

  it('returns null when the stored node is not an isa', () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'entity',
      name: 'X',
      isWeak: false,
      position: { x: 0, y: 0 },
      size: { width: 120, height: 60 },
    })
    const { container } = renderWithProvider(<ISANode {...mkNodeProps(id)} />)
    expect(container.querySelector('[data-kind="isa"]')).not.toBeInTheDocument()
  })
})
