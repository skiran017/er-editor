import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CheatsheetModal } from './CheatsheetModal'
import { useUiStore } from '@/state/uiStore'
import { initI18n } from '@/platform/i18n'

beforeAll(async () => { await initI18n() })

const reset = () => { useUiStore.setState({ modals: [] }) }

describe('CheatsheetModal', () => {
  beforeEach(reset)

  it('has role=dialog with data-kind="cheatsheet"', () => {
    render(<CheatsheetModal modalId="x" />)
    expect(screen.getByRole('dialog')).toHaveAttribute('data-kind', 'cheatsheet')
  })

  it('renders a category heading for each non-empty group', () => {
    render(<CheatsheetModal modalId="x" />)
    expect(screen.getByText('Tools')).toBeInTheDocument()
    expect(screen.getByText('Operations')).toBeInTheDocument()
    expect(screen.getByText('Contextual')).toBeInTheDocument()
  })

  it('renders a <kbd> element per binding key', () => {
    const { container } = render(<CheatsheetModal modalId="x" />)
    const kbds = container.querySelectorAll('kbd')
    expect(kbds.length).toBeGreaterThan(20)
  })

  it('close button pops the modal', async () => {
    useUiStore.setState({ modals: [{ id: 'x', kind: 'cheatsheet', props: {} }] })
    render(<CheatsheetModal modalId="x" />)
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(useUiStore.getState().modals).toEqual([])
  })
})
