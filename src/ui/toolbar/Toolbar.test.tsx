import { describe, it, expect, beforeEach, beforeAll, afterEach, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Toolbar } from './Toolbar'
import { useInteractionStore } from '@/interaction/interactionStore'
import { useDiagramStore } from '@/state/diagramStore'
import { useSelectionStore } from '@/state/selectionStore'
import { useUiStore } from '@/state/uiStore'
import { emptyDiagram } from '@/domain/types'
import type { NodeId } from '@/domain/types'
import { initI18n } from '@/platform/i18n'
import { usePanelMode } from '@/ui/app/usePanelMode'

vi.mock('@/ui/app/usePanelMode', () => ({
  usePanelMode: vi.fn(() => 'desktop' as const),
}))

beforeAll(async () => { await initI18n() })

const reset = () => {
  useInteractionStore.getState().send({ type: 'PICK_TOOL', tool: 'select' })
  useDiagramStore.setState({ diagram: emptyDiagram() })
  useDiagramStore.temporal.getState().clear()
  useSelectionStore.setState({
    selectedNodeIds: new Set<NodeId>(), selectedEdgeIds: new Set(), rubberband: null,
  })
  useUiStore.setState({
    readonly: false,
    panels: { properties: true, minimap: false, toolbar: false },
  })
  vi.mocked(usePanelMode).mockReturnValue('desktop')
}

describe('Toolbar — tool picker', () => {
  beforeEach(reset)

  it('renders a button for each tool in chenPlugin (11) plus the two history buttons (13 total, no delete without selection)', () => {
    render(<Toolbar />)
    // Select (2) + Elements (3: entity/relationship/attribute — isa removed
    // since placing a lone ISA node is semantically invalid) + Connections
    // (6) + History (2: undo/redo) = 13. Delete appears only when something
    // is selected — excluded here.
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBe(13)
  })

  it('clicking "Entity" dispatches PICK_TOOL with tool=entity', async () => {
    render(<Toolbar />)
    await userEvent.click(screen.getByRole('button', { name: 'Entity' }))
    expect(useInteractionStore.getState().snapshot.context.tool).toBe('entity')
  })

  it('active tool reflects FSM state via aria-pressed', async () => {
    render(<Toolbar />)
    await userEvent.click(screen.getByRole('button', { name: 'Entity' }))
    expect(screen.getByRole('button', { name: 'Entity' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Select' })).not.toHaveAttribute('aria-pressed', 'true')
  })

  it('element tools (entity/relationship/attribute) are draggable', () => {
    const { container } = render(<Toolbar />)
    for (const tool of ['entity', 'relationship', 'attribute']) {
      expect(container.querySelector(`[data-tool-id="${tool}"][draggable="true"]`)).toBeInTheDocument()
    }
  })

  it('isa is no longer rendered in the toolbar (placing a lone ISA has no semantic value)', () => {
    const { container } = render(<Toolbar />)
    expect(container.querySelector('[data-tool-id="isa"]')).not.toBeInTheDocument()
  })

  it('non-element tools (select/pan/connect) are not draggable', () => {
    const { container } = render(<Toolbar />)
    for (const tool of ['select', 'pan', 'connect']) {
      expect(container.querySelector(`[data-tool-id="${tool}"][draggable="true"]`)).not.toBeInTheDocument()
    }
  })

  it('dragging a draggable element tool writes the tool id to dataTransfer', () => {
    const { container } = render(<Toolbar />)
    const entityDrag = container.querySelector('[data-tool-id="entity"][draggable="true"]') as HTMLElement
    expect(entityDrag).toBeInTheDocument()
    const store = new Map<string, string>()
    const dataTransfer = {
      setData: (key: string, value: string) => { store.set(key, value) },
      getData: (key: string) => store.get(key) ?? '',
      effectAllowed: 'uninitialized' as string,
    }
    fireEvent.dragStart(entityDrag, { dataTransfer })
    expect(store.get('application/x-er-tool')).toBe('entity')
  })
})

describe('Toolbar — history group (undo / redo)', () => {
  beforeEach(reset)

  it('undo and redo buttons are disabled when no history exists', () => {
    render(<Toolbar />)
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled()
  })

  it('undo enables after a diagram mutation and dispatches UNDO on click', async () => {
    render(<Toolbar />)
    // Mutate the diagram so zundo captures a past state.
    useDiagramStore.getState().addNode({
      kind: 'entity', name: 'E', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    // Button re-renders via useStore subscription on `temporal`.
    const undoBtn = await screen.findByRole('button', { name: 'Undo' })
    expect(undoBtn).not.toBeDisabled()
    await userEvent.click(undoBtn)
    // UNDO event is routed through the FSM; verify the node was actually undone.
    expect(useDiagramStore.getState().diagram.nodeOrder).toHaveLength(0)
  })
})

describe('Toolbar — embed mode', () => {
  beforeEach(reset)
  afterEach(() => useUiStore.setState({ embed: false }))

  it('still renders the toolbar when uiStore.embed is true (students need it to draw)', () => {
    useUiStore.setState({ embed: true })
    const { container } = render(<Toolbar />)
    // Toolbar chrome (data-role="toolbar" or the collapsed mobile toggle)
    // must be present under embed — only the hamburger Menu is hidden.
    expect(container.querySelector('[data-role^="toolbar"]')).not.toBeNull()
  })
})

describe('Toolbar — readonly mode', () => {
  beforeEach(reset)
  afterEach(() => useUiStore.setState({ readonly: false }))

  it('hides element + connection tool groups when uiStore.readonly is true', () => {
    useUiStore.setState({ readonly: true })
    render(<Toolbar />)
    // The select group still renders
    expect(screen.getByRole('button', { name: /select/i })).toBeInTheDocument()
    // The element group is gone
    expect(screen.queryByRole('button', { name: /entity/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /relationship/i })).toBeNull()
  })

  it('disables undo/redo when uiStore.readonly is true', () => {
    useUiStore.setState({ readonly: true })
    render(<Toolbar />)
    expect(screen.getByRole('button', { name: /undo/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /redo/i })).toBeDisabled()
  })

  it('hides the delete trash icon when uiStore.readonly is true', () => {
    // seed selection so the trash would normally render
    useSelectionStore.setState({ selectedNodeIds: new Set(['n1' as NodeId]), selectedEdgeIds: new Set(), rubberband: null })
    useUiStore.setState({ readonly: true })
    render(<Toolbar />)
    expect(screen.queryByRole('button', { name: /delete/i })).toBeNull()
  })
})

describe('Toolbar — responsive layout', () => {
  beforeEach(reset)

  it('desktop: horizontal pill, top-centered', () => {
    vi.mocked(usePanelMode).mockReturnValue('desktop')
    const { container } = render(<Toolbar />)
    const nav = container.querySelector('[data-role="toolbar"]')!
    expect(nav.getAttribute('data-orientation')).toBe('horizontal')
    expect(nav.className).toContain('top-4')
    expect(nav.className).toContain('left-1/2')
    expect(nav.className).toContain('-translate-x-1/2')
    expect(nav.className).toContain('overflow-x-auto')
  })

  it('tablet: vertical rail pinned to the left, always visible', () => {
    vi.mocked(usePanelMode).mockReturnValue('tablet')
    useUiStore.setState({ panels: { properties: true, minimap: false, toolbar: false } })
    const { container } = render(<Toolbar />)
    const nav = container.querySelector('[data-role="toolbar"]')!
    // Vertical rail renders even when panels.toolbar is false — the toggle
    // is mobile-only.
    expect(nav.getAttribute('data-orientation')).toBe('vertical')
    expect(nav.className).toContain('left-2')
    expect(nav.className).toContain('flex-col')
    expect(nav.className).toContain('overflow-y-auto')
    // No mobile-only collapse chevron on tablet.
    expect(screen.queryByRole('button', { name: /hide toolbar/i })).toBeNull()
  })

  it('mobile collapsed: only the expand chevron is rendered', () => {
    vi.mocked(usePanelMode).mockReturnValue('mobile')
    useUiStore.setState({ panels: { properties: true, minimap: false, toolbar: false } })
    const { container } = render(<Toolbar />)
    expect(container.querySelector('[data-role="toolbar"]')).toBeNull()
    expect(container.querySelector('[data-role="toolbar-toggle"]')).not.toBeNull()
    expect(screen.getByRole('button', { name: /show toolbar/i })).toBeInTheDocument()
  })

  it('mobile: clicking the expand chevron opens the rail (sets panels.toolbar=true)', async () => {
    vi.mocked(usePanelMode).mockReturnValue('mobile')
    useUiStore.setState({ panels: { properties: true, minimap: false, toolbar: false } })
    render(<Toolbar />)
    await userEvent.click(screen.getByRole('button', { name: /show toolbar/i }))
    expect(useUiStore.getState().panels.toolbar).toBe(true)
  })

  it('mobile expanded: vertical rail with a collapse chevron at the top', () => {
    vi.mocked(usePanelMode).mockReturnValue('mobile')
    useUiStore.setState({ panels: { properties: true, minimap: false, toolbar: true } })
    const { container } = render(<Toolbar />)
    const nav = container.querySelector('[data-role="toolbar"]')!
    expect(nav.getAttribute('data-orientation')).toBe('vertical')
    expect(screen.getByRole('button', { name: /hide toolbar/i })).toBeInTheDocument()
  })

  it('mobile: picking a tool auto-collapses the rail', async () => {
    vi.mocked(usePanelMode).mockReturnValue('mobile')
    useUiStore.setState({ panels: { properties: true, minimap: false, toolbar: true } })
    render(<Toolbar />)
    await userEvent.click(screen.getByRole('button', { name: 'Entity' }))
    expect(useInteractionStore.getState().snapshot.context.tool).toBe('entity')
    expect(useUiStore.getState().panels.toolbar).toBe(false)
  })

  it('tablet: picking a tool does NOT collapse the rail (no auto-collapse outside mobile)', async () => {
    vi.mocked(usePanelMode).mockReturnValue('tablet')
    useUiStore.setState({ panels: { properties: true, minimap: false, toolbar: true } })
    render(<Toolbar />)
    await userEvent.click(screen.getByRole('button', { name: 'Entity' }))
    expect(useUiStore.getState().panels.toolbar).toBe(true)
  })
})

describe('Toolbar — delete button', () => {
  beforeEach(reset)

  it('is not rendered when nothing is selected', () => {
    render(<Toolbar />)
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('is rendered when a node is selected and dispatches DELETE on click', async () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'E', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    useSelectionStore.setState({
      selectedNodeIds: new Set<NodeId>([id]),
      selectedEdgeIds: new Set(),
      rubberband: null,
    })
    render(<Toolbar />)
    const del = screen.getByRole('button', { name: 'Delete' })
    expect(del).toBeInTheDocument()
    await userEvent.click(del)
    expect(useDiagramStore.getState().diagram.nodeOrder).toHaveLength(0)
  })
})
