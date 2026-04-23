import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MenuBar } from './MenuBar'
import { useUiStore } from '@/state/uiStore'
import { useDiagramStore } from '@/state/diagramStore'
import { emptyDiagram } from '@/domain/types'
import { initI18n } from '@/platform/i18n'

beforeAll(async () => { await initI18n() })

beforeEach(() => {
  useUiStore.setState({
    toasts: [],
    modals: [],
    snap: { gridEnabled: false, gridSize: 10, alignmentEnabled: true, alignmentThreshold: 4 },
    panels: { properties: true, minimap: false },
  })
  useDiagramStore.setState({ diagram: emptyDiagram() })
  useDiagramStore.temporal.getState().clear()
})

describe('MenuBar', () => {
  it('renders all four top-level menu triggers', () => {
    render(<MenuBar />)
    const bar = screen.getByRole('menubar', { name: /Main menu/i })
    // Only the four trigger buttons are visible before anything opens.
    expect(within(bar).getAllByRole('menuitem')).toHaveLength(4)
  })

  it('opening one menu closes any other that was open', async () => {
    render(<MenuBar />)
    // Open File menu.
    await userEvent.click(screen.getByRole('menuitem', { name: /File/i }))
    // File menu dropdown is now present.
    expect(screen.getByRole('menu')).toBeInTheDocument()
    // Open Edit menu while File is open — Edit should replace File.
    await userEvent.click(screen.getByRole('menuitem', { name: /Edit/i }))
    // Only one dropdown <ul role="menu"> is open at a time.
    const menus = screen.getAllByRole('menu')
    expect(menus).toHaveLength(1)
    // And the one that's open is Edit (contains "Undo").
    expect(within(menus[0]!).getByRole('menuitem', { name: /Undo/ })).toBeInTheDocument()
  })
})
