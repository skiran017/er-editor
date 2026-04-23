import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EntityProperties } from './EntityProperties'
import { useDiagramStore } from '@/state/diagramStore'
import { emptyDiagram, type EntityNode } from '@/domain/types'
import { initI18n } from '@/platform/i18n'

beforeAll(async () => { await initI18n() })

const reset = () => {
  useDiagramStore.setState({ diagram: emptyDiagram() })
  useDiagramStore.temporal.getState().clear()
}

const mkEntity = (): EntityNode => {
  const id = useDiagramStore.getState().addNode({
    kind: 'entity', name: 'Customer', isWeak: false,
    position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
  })
  return useDiagramStore.getState().diagram.nodesById[id] as EntityNode
}

describe('EntityProperties', () => {
  beforeEach(reset)

  it('renders current name and isWeak state', () => {
    const node = mkEntity()
    render(<EntityProperties node={node} />)
    expect(screen.getByDisplayValue('Customer')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Weak entity' })).not.toBeChecked()
  })

  it('changing name writes to diagramStore', async () => {
    const node = mkEntity()
    render(<EntityProperties node={node} />)
    const input = screen.getByDisplayValue('Customer')
    await userEvent.clear(input)
    await userEvent.type(input, 'User')
    const after = useDiagramStore.getState().diagram.nodesById[node.id] as EntityNode
    expect(after.name).toBe('User')
  })

  it('toggling isWeak writes to diagramStore', async () => {
    const node = mkEntity()
    render(<EntityProperties node={node} />)
    await userEvent.click(screen.getByRole('checkbox', { name: 'Weak entity' }))
    const after = useDiagramStore.getState().diagram.nodesById[node.id] as EntityNode
    expect(after.isWeak).toBe(true)
  })
})
