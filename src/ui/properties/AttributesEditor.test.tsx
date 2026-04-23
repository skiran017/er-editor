import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AttributesEditor } from './AttributesEditor'
import { useDiagramStore } from '@/state/diagramStore'
import { emptyDiagram, type NodeId } from '@/domain/types'
import { initI18n } from '@/platform/i18n'

beforeAll(async () => { await initI18n() })

const resetStore = () => {
  useDiagramStore.setState({ diagram: emptyDiagram() })
  useDiagramStore.temporal.getState().clear()
}

const addEntity = (name = 'E'): NodeId =>
  useDiagramStore.getState().addNode({
    kind: 'entity', name, isWeak: false,
    position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
  })

const addAttribute = (parentId: NodeId, name: string): NodeId => {
  const attrId = useDiagramStore.getState().addNode({
    kind: 'attribute', name, isKey: false, isDiscriminant: false,
    isMultivalued: false, isDerived: false, isComposite: false,
    position: { x: 200, y: 0 }, size: { width: 90, height: 50 },
  })
  useDiagramStore.getState().addEdge({
    kind: 'attribute-of', sourceId: attrId, targetId: parentId, waypoints: [],
  })
  return attrId
}

describe('AttributesEditor', () => {
  beforeEach(resetStore)

  it('renders one AttributeRow for each attribute-of child of the parent', () => {
    const parent = addEntity()
    addAttribute(parent, 'name')
    addAttribute(parent, 'age')
    const { container } = render(<AttributesEditor parentId={parent} accent="blue" />)
    expect(container.querySelectorAll('[data-role="attribute-row"]')).toHaveLength(2)
  })

  it('typing in the add-attribute input and pressing Enter creates an attribute node AND an attribute-of edge atomically', async () => {
    const parent = addEntity()
    render(<AttributesEditor parentId={parent} accent="blue" />)
    const input = screen.getByLabelText('New attribute name')
    await userEvent.type(input, 'title{Enter}')
    const d = useDiagramStore.getState().diagram
    // 1 entity + 1 new attribute
    expect(d.nodeOrder).toHaveLength(2)
    // 1 attribute-of edge wiring the new attribute to the parent
    expect(d.edgeOrder).toHaveLength(1)
    const edge = d.edgesById[d.edgeOrder[0]!]!
    expect(edge.kind).toBe('attribute-of')
    expect(edge.targetId).toBe(parent)
  })

  it('collapses to the first 5 rows and reveals the rest behind a "Show more" toggle', async () => {
    const parent = addEntity()
    for (let i = 0; i < 7; i++) addAttribute(parent, `a${i}`)
    const { container } = render(<AttributesEditor parentId={parent} accent="blue" />)
    // Only 5 rows visible initially.
    expect(container.querySelectorAll('[data-role="attribute-row"]')).toHaveLength(5)
    const toggle = screen.getByRole('button', { name: /Show 2 more/ })
    await userEvent.click(toggle)
    expect(container.querySelectorAll('[data-role="attribute-row"]')).toHaveLength(7)
    // Toggle flips to "Show less".
    expect(screen.getByRole('button', { name: /Show less/ })).toBeInTheDocument()
  })

  it('Add button is disabled when the name input is empty', () => {
    const parent = addEntity()
    render(<AttributesEditor parentId={parent} accent="blue" />)
    const addBtn = screen.getByRole('button', { name: 'Add attribute' })
    expect(addBtn).toBeDisabled()
  })
})
