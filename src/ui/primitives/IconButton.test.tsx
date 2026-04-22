import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IconButton } from './IconButton'

const StarIcon = () => <span data-testid="star">*</span>

describe('IconButton', () => {
  it('exposes aria-label for accessibility', () => {
    render(<IconButton aria-label="Add star" icon={<StarIcon />} />)
    expect(screen.getByRole('button', { name: 'Add star' })).toBeInTheDocument()
  })

  it('renders the icon node', () => {
    render(<IconButton aria-label="Add star" icon={<StarIcon />} />)
    expect(screen.getByTestId('star')).toBeInTheDocument()
  })

  it('sets aria-pressed="true" when active', () => {
    render(<IconButton aria-label="Toggle" icon={<StarIcon />} active />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  })

  it('omits aria-pressed when inactive', () => {
    render(<IconButton aria-label="Toggle" icon={<StarIcon />} />)
    expect(screen.getByRole('button')).not.toHaveAttribute('aria-pressed')
  })

  it('fires onClick', async () => {
    const onClick = vi.fn()
    render(
      <IconButton aria-label="Click" icon={<StarIcon />} onClick={onClick} />,
    )
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('does not fire onClick when disabled', async () => {
    const onClick = vi.fn()
    render(
      <IconButton
        aria-label="Click"
        icon={<StarIcon />}
        onClick={onClick}
        disabled
      />,
    )
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('defaults to type="button"', () => {
    render(<IconButton aria-label="go" icon={<span>x</span>} />)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })
})
