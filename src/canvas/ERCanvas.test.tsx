import { describe, it, expect, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ERCanvas } from './ERCanvas'
import { useDiagramStore } from '@/state/diagramStore'
import { useViewportStore } from '@/state/viewportStore'
import { useSelectionStore } from '@/state/selectionStore'
import { useValidationStore } from '@/state/validationStore'
import { useUiStore } from '@/state/uiStore'
import { useInteractionStore } from '@/interaction/interactionStore'
import { emptyDiagram } from '@/domain/types'

const resetAll = () => {
  useDiagramStore.setState({ diagram: emptyDiagram() })
  useDiagramStore.temporal.getState().clear()
  useViewportStore.setState({ zoom: 1, pan: { x: 0, y: 0 } })
  useSelectionStore.setState({ selectedNodeIds: new Set(), selectedEdgeIds: new Set(), rubberband: null })
  useValidationStore.setState({ errorsById: {}, enabled: true })
  useUiStore.setState({ inlineRename: null })
  // Reset the interaction FSM tool back to 'select' between tests.
  useInteractionStore.getState().send({ type: 'PICK_TOOL', tool: 'select' })
}

beforeEach(resetAll)

describe('ERCanvas', () => {
  it('mounts a React Flow container with Background + Controls', () => {
    const { container } = render(<ERCanvas />)
    expect(container.querySelector('.react-flow')).toBeInTheDocument()
    expect(screen.getByLabelText(/zoom in/i)).toBeInTheDocument()
  })

  it('renders a stored entity node through the Chen plugin', async () => {
    useDiagramStore.getState().addNode({
      kind: 'entity', name: 'Customer', isWeak: false,
      position: { x: 50, y: 50 }, size: { width: 120, height: 60 },
    })
    render(<ERCanvas />)
    expect(await screen.findByText('Customer')).toBeInTheDocument()
  })

  it('reacts to store mutations (adding a relationship node after mount)', async () => {
    render(<ERCanvas />)
    useDiagramStore.getState().addNode({
      kind: 'relationship', name: 'owns', isIdentifying: false,
      position: { x: 100, y: 100 }, size: { width: 140, height: 70 },
    })
    expect(await screen.findByText('owns')).toBeInTheDocument()
  })

  it('viewport store updates are consumable', () => {
    render(<ERCanvas />)
    useViewportStore.setState({ zoom: 1.5, pan: { x: 20, y: 10 } })
    expect(useViewportStore.getState().zoom).toBe(1.5)
  })

  it('renders InlineRenameOverlay when uiStore.inlineRename is active', () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'Foo', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    useUiStore.getState().startInlineRename({ nodeId: id, initialValue: 'Foo' })
    render(<ERCanvas />)
    expect(screen.getByDisplayValue('Foo')).toBeInTheDocument()
  })

  it('drop of a toolbar tool payload creates a node of the dropped kind', () => {
    const { container } = render(<ERCanvas />)
    const wrapper = container.querySelector('.h-full.w-full.flex-1.relative') as HTMLElement
    expect(wrapper).toBeInTheDocument()
    // Build a minimal dataTransfer polyfill carrying the tool MIME payload —
    // jsdom doesn't ship a DataTransfer constructor.
    const store = new Map<string, string>()
    store.set('application/x-er-tool', 'entity')
    const dataTransfer = {
      setData: (k: string, v: string) => { store.set(k, v) },
      getData: (k: string) => store.get(k) ?? '',
      effectAllowed: 'copy' as string,
      dropEffect: 'none' as string,
    }
    fireEvent.dragOver(wrapper, { dataTransfer })
    fireEvent.drop(wrapper, { dataTransfer, clientX: 100, clientY: 100 })
    const diagram = useDiagramStore.getState().diagram
    expect(diagram.nodeOrder).toHaveLength(1)
    expect(diagram.nodesById[diagram.nodeOrder[0]].kind).toBe('entity')
  })
})
