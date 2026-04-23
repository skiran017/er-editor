import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RelationshipLegsEditor } from './RelationshipLegsEditor'
import { useDiagramStore } from '@/state/diagramStore'
import { useSelectionStore } from '@/state/selectionStore'
import { emptyDiagram, type NodeId } from '@/domain/types'
import { initI18n } from '@/platform/i18n'

beforeAll(async () => { await initI18n() })

const reset = () => {
  useDiagramStore.setState({ diagram: emptyDiagram() })
  useDiagramStore.temporal.getState().clear()
  useSelectionStore.setState({
    selectedNodeIds: new Set(), selectedEdgeIds: new Set(), rubberband: null,
  })
}

const addEntity = (name: string): NodeId =>
  useDiagramStore.getState().addNode({
    kind: 'entity', name, isWeak: false,
    position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
  })

const addRelationship = (): NodeId =>
  useDiagramStore.getState().addNode({
    kind: 'relationship', name: 'R', isIdentifying: false,
    position: { x: 200, y: 0 }, size: { width: 140, height: 70 },
  })

const wire = (entityId: NodeId, relId: NodeId) =>
  useDiagramStore.getState().addEdge({
    kind: 'entity-relationship',
    sourceId: entityId, targetId: relId,
    cardinality: '1', participation: 'partial', waypoints: [],
  })

describe('RelationshipLegsEditor', () => {
  beforeEach(reset)

  it('renders one leg card per entity-relationship edge incident to the relationship', () => {
    const rel = addRelationship()
    const a = addEntity('A')
    const b = addEntity('B')
    wire(a, rel); wire(b, rel)
    const { container } = render(<RelationshipLegsEditor relationshipId={rel} />)
    expect(container.querySelectorAll('[data-role="relationship-leg"]')).toHaveLength(2)
  })

  it('changing cardinality on a leg writes the patch to the specific edge', async () => {
    const rel = addRelationship()
    const a = addEntity('A')
    const edgeId = wire(a, rel)
    render(<RelationshipLegsEditor relationshipId={rel} />)
    // Find the Cardinality select (one leg → first combobox).
    const select = screen.getByRole('combobox', { name: 'Cardinality' })
    await userEvent.selectOptions(select, 'N')
    const edge = useDiagramStore.getState().diagram.edgesById[edgeId]!
    expect(edge.kind === 'entity-relationship' && edge.cardinality).toBe('N')
  })

  it('detects recursion when the same entity appears on both legs and reveals the role input', () => {
    const rel = addRelationship()
    const a = addEntity('Person')
    wire(a, rel); wire(a, rel)
    const { container } = render(<RelationshipLegsEditor relationshipId={rel} />)
    expect(container.querySelector('[data-role="relationship-legs"]')).toHaveAttribute(
      'data-recursive',
      'true',
    )
    // Two role inputs rendered (one per leg).
    expect(screen.getAllByRole('textbox', { name: 'Role' })).toHaveLength(2)
  })

  it('clicking the entity name button selects that entity in the selection store', async () => {
    const rel = addRelationship()
    const a = addEntity('Alpha')
    wire(a, rel)
    render(<RelationshipLegsEditor relationshipId={rel} />)
    await userEvent.click(screen.getByRole('button', { name: 'Alpha' }))
    expect(useSelectionStore.getState().selectedNodeIds.has(a)).toBe(true)
  })
})
