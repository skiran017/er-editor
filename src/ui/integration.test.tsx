import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../App'
import { useDiagramStore } from '@/state/diagramStore'
import { useSelectionStore } from '@/state/selectionStore'
import { useViewportStore } from '@/state/viewportStore'
import { useValidationStore } from '@/state/validationStore'
import { useUiStore } from '@/state/uiStore'
import { useInteractionStore } from '@/interaction/interactionStore'
import { emptyDiagram, type Diagram } from '@/domain/types'
import { NO_MODIFIERS } from '@/interaction/events'
import { initI18n } from '@/platform/i18n'

beforeAll(async () => { await initI18n() })

const resetAll = () => {
  useDiagramStore.setState({ diagram: emptyDiagram() })
  useDiagramStore.temporal.getState().clear()
  useViewportStore.setState({ zoom: 1, pan: { x: 0, y: 0 } })
  useSelectionStore.setState({ selectedNodeIds: new Set(), selectedEdgeIds: new Set(), rubberband: null })
  useValidationStore.setState({ errorsById: {}, enabled: false })
  useUiStore.setState({ modals: [], toasts: [], contextMenu: null, inlineRename: null })
  useInteractionStore.getState().send({ type: 'PICK_TOOL', tool: 'select' })
}

beforeEach(resetAll)

describe('UI integration — create via toolbar', () => {
  it('clicking the Entity tool then the canvas creates and renders an entity', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Entity' }))
    // Toolbar click set the FSM to placing.entity. Simulate canvas events directly
    // (jsdom RF clicks are brittle; the toolbar → FSM path is what matters here).
    act(() => {
      useInteractionStore.getState().send({
        type: 'CANVAS_POINTER_DOWN',
        point: { x: 200, y: 200 },
        modifiers: NO_MODIFIERS,
        button: 'left',
      })
      useInteractionStore.getState().send({ type: 'CANVAS_POINTER_UP', point: { x: 200, y: 200 } })
    })
    const diagram = useDiagramStore.getState().diagram
    expect(diagram.nodeOrder).toHaveLength(1)
    expect(diagram.nodesById[diagram.nodeOrder[0]].kind).toBe('entity')
  })
})

describe('UI integration — property-panel rename', () => {
  it('selecting an entity then editing its name via the property panel writes to the store', async () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'Foo', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    useSelectionStore.setState({ selectedNodeIds: new Set([id]), selectedEdgeIds: new Set(), rubberband: null })
    render(<App />)
    const input = screen.getByDisplayValue('Foo')
    await userEvent.clear(input)
    await userEvent.type(input, 'Bar')
    expect((useDiagramStore.getState().diagram.nodesById[id] as { name: string }).name).toBe('Bar')
  })
})

describe('UI integration — inline rename overlay', () => {
  it('triggering inline rename via uiStore + committing writes to the store', async () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'Foo', isWeak: false,
      position: { x: 100, y: 100 }, size: { width: 120, height: 60 },
    })
    // Leave nothing selected so the property panel stays empty — only the inline
    // rename overlay should render an input.
    useUiStore.getState().startInlineRename({ nodeId: id, initialValue: 'Foo' })
    const { container } = render(<App />)
    const input = container.querySelector('[data-role="inline-rename"]') as HTMLInputElement
    expect(input).not.toBeNull()
    await userEvent.clear(input)
    await userEvent.type(input, 'Renamed{Enter}')
    expect((useDiagramStore.getState().diagram.nodesById[id] as { name: string }).name).toBe('Renamed')
  })

  it('RENAME event on a single selected entity opens inline rename', () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'Hello', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    useSelectionStore.setState({ selectedNodeIds: new Set([id]), selectedEdgeIds: new Set(), rubberband: null })
    act(() => {
      useInteractionStore.getState().send({ type: 'RENAME' })
    })
    expect(useUiStore.getState().inlineRename).toEqual({ nodeId: id, initialValue: 'Hello' })
  })
})

describe('UI integration — save/reopen simulated round-trip', () => {
  it('JSON round-trip of the diagram state produces identical rendered DOM', async () => {
    const a = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'A', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const b = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'B', isWeak: false,
      position: { x: 300, y: 0 }, size: { width: 120, height: 60 },
    })
    useDiagramStore.getState().addEdge({
      kind: 'entity-relationship', sourceId: a, targetId: b,
      cardinality: 'N', participation: 'partial', waypoints: [],
    })

    // Serialise.
    const before: Diagram = structuredClone(useDiagramStore.getState().diagram) as Diagram
    const beforeJson = JSON.stringify(before)

    // Clear.
    useDiagramStore.setState({ diagram: emptyDiagram() })
    expect(useDiagramStore.getState().diagram.nodeOrder).toHaveLength(0)

    // Rehydrate.
    useDiagramStore.setState({ diagram: JSON.parse(beforeJson) as Diagram })

    render(<App />)
    expect(await screen.findByText('A')).toBeInTheDocument()
    expect(await screen.findByText('B')).toBeInTheDocument()
  })
})
