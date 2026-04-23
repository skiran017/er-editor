import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FileMenu } from './FileMenu'
import { useUiStore } from '@/state/uiStore'
import { useDiagramStore } from '@/state/diagramStore'
import { emptyDiagram } from '@/domain/types'
import { initI18n } from '@/platform/i18n'

beforeAll(async () => { await initI18n() })

const reset = () => {
  useUiStore.setState({ toasts: [], modals: [] })
  useDiagramStore.setState({ diagram: emptyDiagram() })
  useDiagramStore.temporal.getState().clear()
}

describe('FileMenu', () => {
  beforeEach(reset)

  it('opens the dropdown when closed trigger is clicked', async () => {
    const onOpen = vi.fn()
    render(<FileMenu isOpen={false} onOpen={onOpen} onClose={() => {}} />)
    await userEvent.click(screen.getByRole('menuitem', { name: /File/i }))
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('lists all six file items when open', () => {
    render(<FileMenu isOpen onOpen={() => {}} onClose={() => {}} />)
    expect(screen.getByRole('menu')).toBeInTheDocument()
    // 1 trigger + 6 items = 7 menuitems
    expect(screen.getAllByRole('menuitem')).toHaveLength(7)
  })

  it('"New diagram" resets the diagram and closes the menu', async () => {
    // Seed some content so we can detect the reset.
    useDiagramStore.getState().addNode({
      kind: 'entity', name: 'A', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    expect(useDiagramStore.getState().diagram.nodeOrder.length).toBe(1)

    const onClose = vi.fn()
    render(<FileMenu isOpen onOpen={() => {}} onClose={onClose} />)
    await userEvent.click(screen.getByRole('menuitem', { name: /New diagram/i }))
    expect(useDiagramStore.getState().diagram.nodeOrder.length).toBe(0)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('"Open…" pushes a phase-5 toast', async () => {
    render(<FileMenu isOpen onOpen={() => {}} onClose={() => {}} />)
    await userEvent.click(screen.getByRole('menuitem', { name: /Open/i }))
    const toasts = useUiStore.getState().toasts
    expect(toasts).toHaveLength(1)
    expect(toasts[0]?.messageKey).toBe('menu:notYetAvailable')
  })
})
