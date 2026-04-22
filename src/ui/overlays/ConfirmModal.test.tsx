import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmModal } from './ConfirmModal'
import { useUiStore } from '@/state/uiStore'
import { initI18n } from '@/platform/i18n'

beforeAll(async () => { await initI18n() })

const reset = () => { useUiStore.setState({ modals: [] }) }

describe('ConfirmModal', () => {
  beforeEach(reset)

  it('renders title + message via i18n', () => {
    render(
      <ConfirmModal
        modalId="x"
        titleKey="modals:confirm.title"
        messageKey="modals:confirm.title"
        onConfirm={vi.fn()}
      />,
    )
    expect(screen.getAllByText('Please confirm')).not.toHaveLength(0)
  })

  it('confirm button calls onConfirm and pops the modal', async () => {
    const onConfirm = vi.fn()
    useUiStore.setState({ modals: [{ id: 'x', kind: 'confirm', props: {} }] })
    render(
      <ConfirmModal
        modalId="x"
        titleKey="modals:confirm.title"
        messageKey="modals:confirm.title"
        onConfirm={onConfirm}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(useUiStore.getState().modals).toEqual([])
  })

  it('cancel button calls onCancel and pops the modal', async () => {
    const onCancel = vi.fn()
    useUiStore.setState({ modals: [{ id: 'x', kind: 'confirm', props: {} }] })
    render(
      <ConfirmModal
        modalId="x"
        titleKey="modals:confirm.title"
        messageKey="modals:confirm.title"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(useUiStore.getState().modals).toEqual([])
  })

  it('danger variant applies the danger button class', () => {
    render(
      <ConfirmModal
        modalId="x"
        titleKey="modals:confirm.title"
        messageKey="modals:confirm.title"
        danger
        onConfirm={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Confirm' }).className).toContain('bg-red-600')
  })
})
