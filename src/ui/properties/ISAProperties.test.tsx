import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ISAProperties } from './ISAProperties'
import { useDiagramStore } from '@/state/diagramStore'
import { emptyDiagram, type ISANode } from '@/domain/types'
import { initI18n } from '@/platform/i18n'

beforeAll(async () => { await initI18n() })

const reset = () => {
  useDiagramStore.setState({ diagram: emptyDiagram() })
  useDiagramStore.temporal.getState().clear()
}

const mkISA = (): ISANode => {
  const id = useDiagramStore.getState().addNode({
    kind: 'isa', isTotal: false,
    position: { x: 0, y: 0 }, size: { width: 40, height: 40 },
  })
  return useDiagramStore.getState().diagram.nodesById[id] as ISANode
}

describe('ISAProperties', () => {
  beforeEach(reset)

  it('renders kind heading and isTotal checkbox state', () => {
    const node = mkISA()
    render(<ISAProperties node={node} />)
    expect(screen.getByText('Generalization')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Total generalization' })).not.toBeChecked()
  })

  it('toggling isTotal writes to diagramStore', async () => {
    const node = mkISA()
    render(<ISAProperties node={node} />)
    await userEvent.click(screen.getByRole('checkbox', { name: 'Total generalization' }))
    const after = useDiagramStore.getState().diagram.nodesById[node.id] as ISANode
    expect(after.isTotal).toBe(true)
  })
})
