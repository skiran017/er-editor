import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ContextMenu } from './ContextMenu'
import { useUiStore } from '@/state/uiStore'
import { initI18n } from '@/platform/i18n'

beforeAll(async () => { await initI18n() })

const reset = () => { useUiStore.getState().closeContextMenu() }

describe('ContextMenu', () => {
  beforeEach(reset)

  it('renders nothing when contextMenu is null', () => {
    const { container } = render(<ContextMenu />)
    expect(container.querySelector('[role="menu"]')).not.toBeInTheDocument()
  })

  it('renders one menuitem per item at the given position', () => {
    useUiStore.getState().openContextMenu({
      at: { x: 120, y: 240 },
      items: [
        { id: 'a', labelKey: 'common:save', onSelect: vi.fn() },
        { id: 'b', labelKey: 'common:delete', onSelect: vi.fn() },
      ],
    })
    render(<ContextMenu />)
    expect(screen.getAllByRole('menuitem')).toHaveLength(2)
  })

  it('positions the menu at (x, y) via inline style', () => {
    useUiStore.getState().openContextMenu({ at: { x: 11, y: 22 }, items: [] })
    const { container } = render(<ContextMenu />)
    const menu = container.querySelector('[role="menu"]') as HTMLElement
    expect(menu.style.left).toBe('11px')
    expect(menu.style.top).toBe('22px')
  })

  it('clicking an item calls onSelect and closes', async () => {
    const onSelect = vi.fn()
    useUiStore.getState().openContextMenu({
      at: { x: 0, y: 0 },
      items: [{ id: 'x', labelKey: 'common:save', onSelect }],
    })
    render(<ContextMenu />)
    await userEvent.click(screen.getByRole('menuitem', { name: 'Save' }))
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(useUiStore.getState().contextMenu).toBeNull()
  })

  it('Escape key closes the menu', async () => {
    useUiStore.getState().openContextMenu({
      at: { x: 0, y: 0 },
      items: [{ id: 'x', labelKey: 'common:save', onSelect: vi.fn() }],
    })
    render(<ContextMenu />)
    await userEvent.keyboard('{Escape}')
    expect(useUiStore.getState().contextMenu).toBeNull()
  })

  it('disabled item does not fire onSelect', async () => {
    const onSelect = vi.fn()
    useUiStore.getState().openContextMenu({
      at: { x: 0, y: 0 },
      items: [{ id: 'x', labelKey: 'common:save', disabled: true, onSelect }],
    })
    render(<ContextMenu />)
    await userEvent.click(screen.getByRole('menuitem', { name: 'Save' }))
    expect(onSelect).not.toHaveBeenCalled()
  })
})
