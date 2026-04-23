import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PropertyPanel } from './PropertyPanel'
import { useDiagramStore } from '@/state/diagramStore'
import { useSelectionStore } from '@/state/selectionStore'
import { emptyDiagram, type NodeId, type EdgeId } from '@/domain/types'
import { initI18n } from '@/platform/i18n'

beforeAll(async () => { await initI18n() })

const reset = () => {
  useDiagramStore.setState({ diagram: emptyDiagram() })
  useDiagramStore.temporal.getState().clear()
  useSelectionStore.setState({ selectedNodeIds: new Set(), selectedEdgeIds: new Set(), rubberband: null })
}

describe('PropertyPanel', () => {
  beforeEach(reset)

  it('empty selection → EmptyPanel', () => {
    render(<PropertyPanel />)
    expect(screen.getByText(/select a node or edge/i)).toBeInTheDocument()
  })

  it('multi selection → MultiSelectSummary with count', () => {
    useSelectionStore.setState({
      selectedNodeIds: new Set<NodeId>(['a' as NodeId, 'b' as NodeId]),
      selectedEdgeIds: new Set(),
      rubberband: null,
    })
    render(<PropertyPanel />)
    expect(screen.getByText('2 items selected')).toBeInTheDocument()
  })

  it('single node selection → panel carries data-node-kind', () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'A', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    useSelectionStore.setState({ selectedNodeIds: new Set([id]), selectedEdgeIds: new Set(), rubberband: null })
    const { container } = render(<PropertyPanel />)
    expect(container.querySelector('[data-role="property-panel"]')).toHaveAttribute('data-node-kind', 'entity')
  })

  it('single edge selection → panel carries data-edge-kind', () => {
    const s = useDiagramStore.getState().addNode({ kind: 'entity', name: 'A', isWeak: false, position: { x: 0, y: 0 }, size: { width: 120, height: 60 } })
    const t = useDiagramStore.getState().addNode({ kind: 'relationship', name: 'r', isIdentifying: false, position: { x: 200, y: 0 }, size: { width: 140, height: 70 } })
    const eid = useDiagramStore.getState().addEdge({ kind: 'entity-relationship', sourceId: s, targetId: t, cardinality: '1', participation: 'total', waypoints: [] })
    useSelectionStore.setState({ selectedNodeIds: new Set(), selectedEdgeIds: new Set<EdgeId>([eid]), rubberband: null })
    const { container } = render(<PropertyPanel />)
    expect(container.querySelector('[data-role="property-panel"]')).toHaveAttribute('data-edge-kind', 'entity-relationship')
  })

  it('stale selection (id not in store) → EmptyPanel', () => {
    useSelectionStore.setState({ selectedNodeIds: new Set<NodeId>(['ghost' as NodeId]), selectedEdgeIds: new Set(), rubberband: null })
    render(<PropertyPanel />)
    expect(screen.getByText(/select a node or edge/i)).toBeInTheDocument()
  })
})
