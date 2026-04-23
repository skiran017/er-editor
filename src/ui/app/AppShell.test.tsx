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

  it('renders all four slots when a node is selected', () => {
    render(
      <AppShell
        menuBar={<div data-testid="menu">Menu</div>}
        toolbar={<div data-testid="tb">Toolbar</div>}
        canvas={<div data-testid="canvas">Canvas</div>}
        properties={<div data-testid="props">Properties</div>}
      />,
    )
    expect(screen.getByTestId('menu')).toBeInTheDocument()
    expect(screen.getByTestId('tb')).toBeInTheDocument()
    expect(screen.getByTestId('canvas')).toBeInTheDocument()
    expect(screen.getByTestId('props')).toBeInTheDocument()
  })

  it('hides properties pane when uiStore.panels.properties is false', () => {
    useUiStore.setState({ panels: { properties: false, minimap: false } })
    render(
      <AppShell
        menuBar={<div />}
        toolbar={<div />}
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
        menuBar={<div />}
        toolbar={<div />}
        canvas={<div />}
        properties={<div data-testid="props" />}
      />,
    )
    expect(screen.queryByTestId('props')).not.toBeInTheDocument()
  })

  it('renders overlays slot above the main layout', () => {
    render(
      <AppShell
        menuBar={<div />}
        toolbar={<div />}
        canvas={<div />}
        properties={<div />}
        overlays={<div data-testid="overlay">Overlays</div>}
      />,
    )
    expect(screen.getByTestId('overlay')).toBeInTheDocument()
  })
})
