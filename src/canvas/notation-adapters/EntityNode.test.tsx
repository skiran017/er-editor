import type { ReactElement } from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { ReactFlowProvider, type Node, type NodeProps } from '@xyflow/react'
import { EntityNode } from './EntityNode'
import { useDiagramStore } from '@/state/diagramStore'
import { useSelectionStore } from '@/state/selectionStore'
import { useValidationStore } from '@/state/validationStore'
import { emptyDiagram, type NodeId } from '@/domain/types'
import type { NotationNodeData } from '@/notation/types'

type EntityRfNode = Node<NotationNodeData, 'entity'>

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
  ({ id, data: { nodeId: id }, type: 'entity' }) as unknown as NodeProps<EntityRfNode>

const renderWithProvider = (ui: ReactElement) =>
  render(
    <ReactFlowProvider>
      <svg>{ui}</svg>
    </ReactFlowProvider>,
  )

describe('EntityNode container', () => {
  beforeEach(resetStores)

  it('subscribes to diagramStore and renders the EntityGlyph with the node name', () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'entity',
      name: 'Customer',
      isWeak: false,
      position: { x: 0, y: 0 },
      size: { width: 120, height: 60 },
    })
    const { getByText } = renderWithProvider(<EntityNode {...mkNodeProps(id)} />)
    expect(getByText('Customer')).toBeInTheDocument()
  })

  it('passes selection state through as isSelected', () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'entity',
      name: 'A',
      isWeak: false,
      position: { x: 0, y: 0 },
      size: { width: 120, height: 60 },
    })
    useSelectionStore.setState({
      selectedNodeIds: new Set<NodeId>([id]),
      selectedEdgeIds: new Set(),
      rubberband: null,
    })
    const { container } = renderWithProvider(<EntityNode {...mkNodeProps(id)} />)
    expect(container.querySelector('[data-selected="true"]')).toBeInTheDocument()
  })

  it('passes warning severity through when validationStore has errors for the id', () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'entity',
      name: 'A',
      isWeak: false,
      position: { x: 0, y: 0 },
      size: { width: 120, height: 60 },
    })
    useValidationStore.setState({
      errorsById: {
        [id]: [{ ruleId: 'x', severity: 'error', targetId: id, messageKey: 'x' }],
      },
      enabled: true,
    })
    const { container } = renderWithProvider(<EntityNode {...mkNodeProps(id)} />)
    const badge = container.querySelector('[data-role="warning-badge"]')
    expect(badge).toBeInTheDocument()
    // SVG elements return SVGAnimatedString for .className — read the class attribute directly.
    expect(badge?.getAttribute('class')).toContain('fill-red-500')
  })

  it('returns null if the node is absent from the store (stale RF frame)', () => {
    const { container } = renderWithProvider(
      <EntityNode {...mkNodeProps('stale' as NodeId)} />,
    )
    expect(container.querySelector('[data-kind="entity"]')).not.toBeInTheDocument()
  })
})
