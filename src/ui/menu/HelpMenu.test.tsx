import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HelpMenu } from './HelpMenu'
import { useUiStore } from '@/state/uiStore'
import { initI18n } from '@/platform/i18n'

beforeAll(async () => { await initI18n() })

beforeEach(() => {
  useUiStore.setState({ modals: [], toasts: [] })
})

describe('HelpMenu', () => {
  it('renders the trigger label', () => {
    render(<HelpMenu isOpen={false} onOpen={() => {}} onClose={() => {}} />)
    expect(screen.getByRole('menuitem', { name: /Help/i })).toBeInTheDocument()
  })

  it('clicking "Keyboard shortcuts" pushes a cheatsheet modal and closes the menu', async () => {
    const onClose = vi.fn()
    render(<HelpMenu isOpen onOpen={() => {}} onClose={onClose} />)
    await userEvent.click(screen.getByRole('menuitem', { name: /Keyboard shortcuts/i }))
    const modals = useUiStore.getState().modals
    expect(modals).toHaveLength(1)
    expect(modals[0]?.kind).toBe('cheatsheet')
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
