import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MenuItem } from './MenuItem'

describe('MenuItem', () => {
  it('renders the label', () => {
    render(<MenuItem label="Undo" onSelect={() => {}} />)
    expect(screen.getByRole('menuitem', { name: /Undo/ })).toBeInTheDocument()
  })

  it('fires onSelect when clicked', async () => {
    const onSelect = vi.fn()
    render(<MenuItem label="Redo" onSelect={onSelect} />)
    await userEvent.click(screen.getByRole('menuitem', { name: /Redo/ }))
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('disabled blocks onSelect and sets disabled attribute', async () => {
    const onSelect = vi.fn()
    render(<MenuItem label="Copy" disabled onSelect={onSelect} />)
    const item = screen.getByRole('menuitem', { name: /Copy/ })
    expect(item).toBeDisabled()
    await userEvent.click(item)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('renders a <kbd> when shortcut is provided', () => {
    const { container } = render(<MenuItem label="Save" shortcut="Ctrl+S" onSelect={() => {}} />)
    const kbd = container.querySelector('kbd')
    expect(kbd).not.toBeNull()
    expect(kbd?.textContent).toBe('Ctrl+S')
  })
})
