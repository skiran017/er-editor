import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EdgeProperties } from './EdgeProperties'
import { useDiagramStore } from '@/state/diagramStore'
import { emptyDiagram, type EntityRelationshipEdge } from '@/domain/types'
import { initI18n } from '@/platform/i18n'

beforeAll(async () => { await initI18n() })

const reset = () => {
  useDiagramStore.setState({ diagram: emptyDiagram() })
  useDiagramStore.temporal.getState().clear()
}

const mkERedge = (): EntityRelationshipEdge => {
  const s = useDiagramStore.getState().addNode({ kind: 'entity', name: 'A', isWeak: false, position: { x: 0, y: 0 }, size: { width: 120, height: 60 } })
  const t = useDiagramStore.getState().addNode({ kind: 'relationship', name: 'r', isIdentifying: false, position: { x: 300, y: 0 }, size: { width: 140, height: 70 } })
  const id = useDiagramStore.getState().addEdge({ kind: 'entity-relationship', sourceId: s, targetId: t, cardinality: '1', participation: 'partial', waypoints: [] })
  return useDiagramStore.getState().diagram.edgesById[id] as EntityRelationshipEdge
}

describe('EdgeProperties (entity-relationship)', () => {
  beforeEach(reset)

  it('renders cardinality, participation, role controls', () => {
    const edge = mkERedge()
    render(<EdgeProperties edge={edge} />)
    expect(screen.getByRole('combobox', { name: 'Cardinality' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Participation' })).toBeInTheDocument()
    expect(screen.getByLabelText('Role')).toBeInTheDocument()
  })

  it('changing cardinality writes to diagramStore', async () => {
    const edge = mkERedge()
    render(<EdgeProperties edge={edge} />)
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Cardinality' }), 'N')
    const after = useDiagramStore.getState().diagram.edgesById[edge.id] as EntityRelationshipEdge
    expect(after.cardinality).toBe('N')
  })

  it('changing role to empty writes undefined (not empty string)', async () => {
    const edge = mkERedge()
    useDiagramStore.getState().updateEdge(edge.id, { role: 'manages' })
    render(<EdgeProperties edge={useDiagramStore.getState().diagram.edgesById[edge.id] as EntityRelationshipEdge} />)
    await userEvent.clear(screen.getByLabelText('Role'))
    const after = useDiagramStore.getState().diagram.edgesById[edge.id] as EntityRelationshipEdge
    expect(after.role).toBeUndefined()
  })
})

describe('EdgeProperties (non-ER edges)', () => {
  beforeEach(reset)

  it('attribute-of edge renders read-only summary, no editable controls', () => {
    const s = useDiagramStore.getState().addNode({ kind: 'attribute', name: 'id', isKey: true, isDiscriminant: false, isMultivalued: false, isDerived: false, isComposite: false, position: { x: 0, y: 0 }, size: { width: 90, height: 50 } })
    const t = useDiagramStore.getState().addNode({ kind: 'entity', name: 'A', isWeak: false, position: { x: 200, y: 0 }, size: { width: 120, height: 60 } })
    const id = useDiagramStore.getState().addEdge({ kind: 'attribute-of', sourceId: s, targetId: t, waypoints: [] })
    const edge = useDiagramStore.getState().diagram.edgesById[id]!
    const { container } = render(<EdgeProperties edge={edge} />)
    expect(container.querySelector('[data-edge-kind="attribute-of"]')).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).toBeNull()
  })
})
