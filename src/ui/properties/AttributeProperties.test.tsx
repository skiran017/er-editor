import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AttributeProperties } from './AttributeProperties'
import { useDiagramStore } from '@/state/diagramStore'
import { emptyDiagram, type AttributeNode } from '@/domain/types'
import { initI18n } from '@/platform/i18n'

beforeAll(async () => { await initI18n() })

const reset = () => {
  useDiagramStore.setState({ diagram: emptyDiagram() })
  useDiagramStore.temporal.getState().clear()
}

const mkAttribute = (): AttributeNode => {
  const id = useDiagramStore.getState().addNode({
    kind: 'attribute', name: 'ssn',
    isKey: true, isDiscriminant: false, isMultivalued: false, isDerived: false, isComposite: false,
    position: { x: 0, y: 0 }, size: { width: 100, height: 40 },
  })
  return useDiagramStore.getState().diagram.nodesById[id] as AttributeNode
}

describe('AttributeProperties', () => {
  beforeEach(reset)

  it('renders current name and checkbox states', () => {
    const node = mkAttribute()
    render(<AttributeProperties node={node} />)
    expect(screen.getByDisplayValue('ssn')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Key attribute' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Discriminant (partial key)' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Multivalued' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Derived' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Composite' })).not.toBeChecked()
  })

  it('changing name writes to diagramStore', async () => {
    const node = mkAttribute()
    render(<AttributeProperties node={node} />)
    const input = screen.getByDisplayValue('ssn')
    await userEvent.clear(input)
    await userEvent.type(input, 'email')
    const after = useDiagramStore.getState().diagram.nodesById[node.id] as AttributeNode
    expect(after.name).toBe('email')
  })

  it('toggling isKey writes to diagramStore', async () => {
    const node = mkAttribute()
    render(<AttributeProperties node={node} />)
    await userEvent.click(screen.getByRole('checkbox', { name: 'Key attribute' }))
    const after = useDiagramStore.getState().diagram.nodesById[node.id] as AttributeNode
    expect(after.isKey).toBe(false)
  })

  it('toggling isMultivalued writes to diagramStore', async () => {
    const node = mkAttribute()
    render(<AttributeProperties node={node} />)
    await userEvent.click(screen.getByRole('checkbox', { name: 'Multivalued' }))
    const after = useDiagramStore.getState().diagram.nodesById[node.id] as AttributeNode
    expect(after.isMultivalued).toBe(true)
  })
})
