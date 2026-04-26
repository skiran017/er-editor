import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AppShell } from './AppShell'
import { useUiStore } from '@/state/uiStore'
import { useSelectionStore } from '@/state/selectionStore'
import { usePanelMode } from './usePanelMode'
import type { NodeId } from '@/domain/types'

vi.mock('./usePanelMode', () => ({
  usePanelMode: vi.fn(() => 'desktop' as const),
}))

const reset = () => {
  useUiStore.setState({ panels: { properties: true, minimap: false } })
  useSelectionStore.setState({
    selectedNodeIds: new Set<NodeId>(['n1' as NodeId]),
    selectedEdgeIds: new Set(),
    rubberband: null,
  })
  vi.mocked(usePanelMode).mockReturnValue('desktop')
}

describe('AppShell', () => {
  beforeEach(reset)

  it('renders canvas, properties, chrome, and overlays when a node is selected (desktop)', () => {
    // existing assertion — both inline panel and chrome appear
    render(
      <AppShell
        canvas={<div data-testid="canvas">Canvas</div>}
        properties={<div data-testid="props">Properties</div>}
        chrome={<div data-testid="chrome">Chrome</div>}
        overlays={<div data-testid="overlay">Overlays</div>}
      />,
    )
    expect(screen.getByTestId('canvas')).toBeInTheDocument()
    expect(screen.getByTestId('props')).toBeInTheDocument()
    expect(screen.getByTestId('chrome')).toBeInTheDocument()
    expect(screen.getByTestId('overlay')).toBeInTheDocument()
    // Desktop renders the inline aside, NOT the drawer.
    expect(document.querySelector('[data-role="properties-panel"]')).not.toBeNull()
    expect(document.querySelector('[data-role="property-drawer"]')).toBeNull()
  })

  it('hides properties pane when uiStore.panels.properties is false', () => {
    useUiStore.setState({ panels: { properties: false, minimap: false } })
    render(<AppShell canvas={<div />} properties={<div data-testid="props" />} />)
    expect(screen.queryByTestId('props')).not.toBeInTheDocument()
  })

  it('hides properties pane when nothing is selected', () => {
    useSelectionStore.setState({
      selectedNodeIds: new Set(),
      selectedEdgeIds: new Set(),
      rubberband: null,
    })
    render(<AppShell canvas={<div />} properties={<div data-testid="props" />} />)
    expect(screen.queryByTestId('props')).not.toBeInTheDocument()
  })

  it('chrome slot is still rendered when the properties pane is hidden', () => {
    useSelectionStore.setState({
      selectedNodeIds: new Set(),
      selectedEdgeIds: new Set(),
      rubberband: null,
    })
    render(
      <AppShell
        canvas={<div />}
        properties={<div data-testid="props" />}
        chrome={<div data-testid="chrome" />}
      />,
    )
    expect(screen.queryByTestId('props')).not.toBeInTheDocument()
    expect(screen.getByTestId('chrome')).toBeInTheDocument()
  })

  it('renders PropertyDrawer (not inline aside) on mobile', () => {
    vi.mocked(usePanelMode).mockReturnValue('mobile')
    render(
      <AppShell
        canvas={<div />}
        properties={<div data-testid="props" />}
      />,
    )
    expect(document.querySelector('[data-role="properties-panel"]')).toBeNull()
    expect(document.querySelector('[data-role="property-drawer"]')).not.toBeNull()
    expect(screen.getByTestId('props')).toBeInTheDocument()
  })

  it('renders PropertyDrawer on tablet', () => {
    vi.mocked(usePanelMode).mockReturnValue('tablet')
    render(
      <AppShell
        canvas={<div />}
        properties={<div data-testid="props" />}
      />,
    )
    expect(document.querySelector('[data-role="property-drawer"]')).not.toBeNull()
    expect(document.querySelector('[data-role="property-drawer"]')!.getAttribute('data-mode')).toBe('tablet')
  })

  it('PropertyDrawer onClose deselects (closes the drawer) without touching the persisted panels toggle', () => {
    // Important: the drawer's close handler must NOT flip uiStore.panels.properties.
    // That flag is persisted, and flipping it from a transient mobile gesture
    // would survive reload and silently disable the property panel on every
    // screen size until the user manually flipped it back from the menu.
    vi.mocked(usePanelMode).mockReturnValue('mobile')
    render(<AppShell canvas={<div />} properties={<div />} />)
    const panelsBefore = useUiStore.getState().panels.properties
    const backdrop = screen.getByTestId('drawer-backdrop')
    backdrop.click()
    // Selection cleared → drawer closes for this selection.
    expect(useSelectionStore.getState().selectedNodeIds.size).toBe(0)
    // Persisted toggle UNCHANGED — re-selecting any node will reopen the drawer.
    expect(useUiStore.getState().panels.properties).toBe(panelsBefore)
  })
})
