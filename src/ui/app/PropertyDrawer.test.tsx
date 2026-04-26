import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PropertyDrawer } from './PropertyDrawer'

describe('PropertyDrawer', () => {
  it('renders content + close button when open', () => {
    const onClose = vi.fn()
    render(
      <PropertyDrawer mode="mobile" open onClose={onClose}>
        <div>panel-body</div>
      </PropertyDrawer>,
    )
    expect(screen.getByText('panel-body')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
  })

  it('returns null when not open', () => {
    const { container } = render(
      <PropertyDrawer mode="mobile" open={false} onClose={vi.fn()}>
        <div>x</div>
      </PropertyDrawer>,
    )
    expect(container.firstChild).toBeNull()
  })

  it('calls onClose when the backdrop is clicked (mobile)', () => {
    const onClose = vi.fn()
    render(
      <PropertyDrawer mode="mobile" open onClose={onClose}>
        <div>x</div>
      </PropertyDrawer>,
    )
    fireEvent.click(screen.getByTestId('drawer-backdrop'))
    expect(onClose).toHaveBeenCalled()
  })

  it('uses bottom-sheet classes on mobile and side-sheet classes on tablet', () => {
    const { rerender, container } = render(
      <PropertyDrawer mode="mobile" open onClose={vi.fn()}><div /></PropertyDrawer>,
    )
    let panel = container.querySelector('[data-role="property-drawer"]')!
    expect(panel.className).toContain('bottom-0')
    rerender(
      <PropertyDrawer mode="tablet" open onClose={vi.fn()}><div /></PropertyDrawer>,
    )
    panel = container.querySelector('[data-role="property-drawer"]')!
    expect(panel.className).toContain('right-0')
  })

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn()
    render(
      <PropertyDrawer mode="mobile" open onClose={onClose}>
        <div>x</div>
      </PropertyDrawer>,
    )
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('exposes dialog semantics for screen readers', () => {
    render(
      <PropertyDrawer mode="mobile" open onClose={vi.fn()}>
        <div>x</div>
      </PropertyDrawer>,
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', 'property-drawer-title')
    // The element referenced by aria-labelledby must exist.
    expect(document.getElementById('property-drawer-title')).not.toBeNull()
  })

  it('calls onClose when the user presses Escape while open', () => {
    const onClose = vi.fn()
    render(
      <PropertyDrawer mode="mobile" open onClose={onClose}>
        <div>x</div>
      </PropertyDrawer>,
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('does NOT listen for Escape while closed', () => {
    const onClose = vi.fn()
    render(
      <PropertyDrawer mode="mobile" open={false} onClose={onClose}>
        <div>x</div>
      </PropertyDrawer>,
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })
})
