import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RelationshipProperties } from './RelationshipProperties'
import { useDiagramStore } from '@/state/diagramStore'
import { emptyDiagram, type RelationshipNode } from '@/domain/types'
import { initI18n } from '@/platform/i18n'

beforeAll(async () => { await initI18n() })

const reset = () => {
  useDiagramStore.setState({ diagram: emptyDiagram() })
  useDiagramStore.temporal.getState().clear()
}

const mkRel = (): RelationshipNode => {
  const id = useDiagramStore.getState().addNode({
    kind: 'relationship', name: 'owns', isIdentifying: false,
    position: { x: 0, y: 0 }, size: { width: 140, height: 70 },
  })
  return useDiagramStore.getState().diagram.nodesById[id] as RelationshipNode
}

describe('RelationshipProperties', () => {
  beforeEach(reset)

  it('renders current name and isIdentifying state', () => {
    const node = mkRel()
    render(<RelationshipProperties node={node} />)
    expect(screen.getByDisplayValue('owns')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Identifying relationship' })).not.toBeChecked()
  })

  it('changing name writes to diagramStore', async () => {
    const node = mkRel()
    render(<RelationshipProperties node={node} />)
    const input = screen.getByDisplayValue('owns')
    await userEvent.clear(input)
    await userEvent.type(input, 'manages')
    const after = useDiagramStore.getState().diagram.nodesById[node.id] as RelationshipNode
    expect(after.name).toBe('manages')
  })

  it('toggling isIdentifying writes to diagramStore', async () => {
    const node = mkRel()
    render(<RelationshipProperties node={node} />)
    await userEvent.click(screen.getByRole('checkbox', { name: 'Identifying relationship' }))
    const after = useDiagramStore.getState().diagram.nodesById[node.id] as RelationshipNode
    expect(after.isIdentifying).toBe(true)
  })
})
