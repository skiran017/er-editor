import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AppShell } from './AppShell'
import { useUiStore } from '@/state/uiStore'
import { useSelectionStore } from '@/state/selectionStore'
import type { NodeId } from '@/domain/types'

const reset = () => {
  useUiStore.setState({ panels: { properties: true, minimap: false } })
  useSelectionStore.setState({
    selectedNodeIds: new Set<NodeId>(['n1' as NodeId]),
    selectedEdgeIds: new Set(),
    rubberband: null,
  })
}

describe('AppShell', () => {
  beforeEach(reset)

  it('renders canvas, properties, chrome, and overlays when a node is selected', () => {
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
  })

  it('hides properties pane when uiStore.panels.properties is false', () => {
    useUiStore.setState({ panels: { properties: false, minimap: false } })
    render(
      <AppShell
        canvas={<div />}
        properties={<div data-testid="props" />}
      />,
    )
    expect(screen.queryByTestId('props')).not.toBeInTheDocument()
  })

  it('hides properties pane when nothing is selected', () => {
    useSelectionStore.setState({
      selectedNodeIds: new Set(),
      selectedEdgeIds: new Set(),
      rubberband: null,
    })
    render(
      <AppShell
        canvas={<div />}
        properties={<div data-testid="props" />}
      />,
    )
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
})
