import { describe, it, expect, beforeEach, beforeAll, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditMenu } from './EditMenu'
import { useInteractionStore } from '@/interaction/interactionStore'
import { initI18n } from '@/platform/i18n'

beforeAll(async () => { await initI18n() })

let sendSpy: ReturnType<typeof vi.fn>

beforeEach(() => {
  sendSpy = vi.fn()
  vi.spyOn(useInteractionStore, 'getState').mockReturnValue({
    snapshot: useInteractionStore.getState().snapshot,
    send: sendSpy,
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('EditMenu', () => {
  it('lists nine items when open', () => {
    render(<EditMenu isOpen onOpen={() => {}} onClose={() => {}} />)
    // 1 trigger + 9 items = 10 menuitems
    expect(screen.getAllByRole('menuitem')).toHaveLength(10)
  })

  it('clicking "Undo" dispatches { type: "UNDO" } and closes the menu', async () => {
    const onClose = vi.fn()
    render(<EditMenu isOpen onOpen={() => {}} onClose={onClose} />)
    await userEvent.click(screen.getByRole('menuitem', { name: /Undo/ }))
    expect(sendSpy).toHaveBeenCalledWith({ type: 'UNDO' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('clicking "Delete" dispatches { type: "DELETE" }', async () => {
    render(<EditMenu isOpen onOpen={() => {}} onClose={() => {}} />)
    await userEvent.click(screen.getByRole('menuitem', { name: /Delete/ }))
    expect(sendSpy).toHaveBeenCalledWith({ type: 'DELETE' })
  })
})
