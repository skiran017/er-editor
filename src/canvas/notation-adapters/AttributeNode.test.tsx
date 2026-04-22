import type { ReactElement } from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { ReactFlowProvider, type Node, type NodeProps } from '@xyflow/react'
import { AttributeNode } from './AttributeNode'
import { useDiagramStore } from '@/state/diagramStore'
import { useSelectionStore } from '@/state/selectionStore'
import { useValidationStore } from '@/state/validationStore'
import { emptyDiagram, type NodeId } from '@/domain/types'
import type { NotationNodeData } from '@/notation/types'

type AttributeRfNode = Node<NotationNodeData, 'attribute'>

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
  ({ id, data: { nodeId: id }, type: 'attribute' }) as unknown as NodeProps<AttributeRfNode>

const renderWithProvider = (ui: ReactElement) =>
  render(
    <ReactFlowProvider>
      <svg>{ui}</svg>
    </ReactFlowProvider>,
  )

describe('AttributeNode container', () => {
  beforeEach(resetStores)

  it('renders a key attribute with underlined name', () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'attribute',
      name: 'ssn',
      isKey: true,
      isDiscriminant: false,
      isMultivalued: false,
      isDerived: false,
      isComposite: false,
      position: { x: 0, y: 0 },
      size: { width: 90, height: 50 },
    })
    const { container } = renderWithProvider(<AttributeNode {...mkNodeProps(id)} />)
    const text = container.querySelector('text')
    expect(text?.getAttribute('text-decoration')).toContain('underline')
  })

  it('renders a multivalued attribute with two ellipses', () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'attribute',
      name: 'phones',
      isKey: false,
      isDiscriminant: false,
      isMultivalued: true,
      isDerived: false,
      isComposite: false,
      position: { x: 0, y: 0 },
      size: { width: 90, height: 50 },
    })
    const { container } = renderWithProvider(<AttributeNode {...mkNodeProps(id)} />)
    expect(container.querySelectorAll('ellipse').length).toBe(2)
  })

  it('returns null when the stored node is not an attribute', () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'entity',
      name: 'X',
      isWeak: false,
      position: { x: 0, y: 0 },
      size: { width: 120, height: 60 },
    })
    const { container } = renderWithProvider(<AttributeNode {...mkNodeProps(id)} />)
    expect(container.querySelector('[data-kind="attribute"]')).not.toBeInTheDocument()
  })
})
