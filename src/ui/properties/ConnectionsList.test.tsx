import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConnectionsList } from './ConnectionsList'
import { useDiagramStore } from '@/state/diagramStore'
import { useSelectionStore } from '@/state/selectionStore'
import { emptyDiagram } from '@/domain/types'
import { initI18n } from '@/platform/i18n'

beforeAll(async () => {
  await initI18n()
})

const reset = () => {
  useDiagramStore.setState({ diagram: emptyDiagram() })
  useDiagramStore.temporal.getState().clear()
  useSelectionStore.setState({
    selectedNodeIds: new Set(),
    selectedEdgeIds: new Set(),
    rubberband: null,
  })
}

describe('ConnectionsList', () => {
  beforeEach(reset)

  it('shows "no connections" when the node has none', () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'entity',
      name: 'A',
      isWeak: false,
      position: { x: 0, y: 0 },
      size: { width: 120, height: 60 },
    })
    render(<ConnectionsList nodeId={id} />)
    expect(screen.getByText(/no connections/i)).toBeInTheDocument()
  })

  it('lists every edge touching the node with the other endpoint label', () => {
    const a = useDiagramStore.getState().addNode({
      kind: 'entity',
      name: 'Person',
      isWeak: false,
      position: { x: 0, y: 0 },
      size: { width: 120, height: 60 },
    })
    const rel = useDiagramStore.getState().addNode({
      kind: 'relationship',
      name: 'Works',
      isIdentifying: false,
      position: { x: 300, y: 0 },
      size: { width: 140, height: 70 },
    })
    useDiagramStore.getState().addEdge({
      kind: 'entity-relationship',
      sourceId: a,
      targetId: rel,
      cardinality: '1',
      participation: 'total',
      waypoints: [],
    })
    render(<ConnectionsList nodeId={a} />)
    expect(screen.getByText('Works')).toBeInTheDocument()
  })

  it('clicking a row selects the other endpoint', async () => {
    const a = useDiagramStore.getState().addNode({
      kind: 'entity',
      name: 'Person',
      isWeak: false,
      position: { x: 0, y: 0 },
      size: { width: 120, height: 60 },
    })
    const b = useDiagramStore.getState().addNode({
      kind: 'relationship',
      name: 'Works',
      isIdentifying: false,
      position: { x: 300, y: 0 },
      size: { width: 140, height: 70 },
    })
    useDiagramStore.getState().addEdge({
      kind: 'entity-relationship',
      sourceId: a,
      targetId: b,
      cardinality: '1',
      participation: 'total',
      waypoints: [],
    })
    render(<ConnectionsList nodeId={a} />)
    await userEvent.click(screen.getByRole('button', { name: /works/i }))
    const sel = useSelectionStore.getState().selectedNodeIds
    expect(sel.has(b)).toBe(true)
    expect(sel.has(a)).toBe(false)
  })
})
