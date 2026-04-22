import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ModalStack } from './ModalStack'
import { useUiStore } from '@/state/uiStore'
import { initI18n } from '@/platform/i18n'

beforeAll(async () => { await initI18n() })

const reset = () => { useUiStore.setState({ modals: [] }) }

describe('ModalStack', () => {
  beforeEach(reset)

  it('renders nothing when no modals are pushed', () => {
    const { container } = render(<ModalStack />)
    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument()
  })

  it('renders a ConfirmModal when topmost modal is kind=confirm', () => {
    useUiStore.setState({
      modals: [
        {
          id: 'm1',
          kind: 'confirm',
          props: {
            titleKey: 'modals:confirm.title',
            messageKey: 'modals:confirm.title',
            onConfirm: () => {},
          },
        },
      ],
    })
    render(<ModalStack />)
    expect(screen.getByRole('dialog')).toHaveAttribute('data-kind', 'confirm')
  })

  it('renders ErrorModal when topmost is kind=error', () => {
    useUiStore.setState({
      modals: [
        { id: 'm1', kind: 'error', props: { messageKey: 'common:save' } },
      ],
    })
    render(<ModalStack />)
    expect(screen.getByRole('alertdialog')).toHaveAttribute('data-kind', 'error')
  })

  it('shows only the topmost modal when stacked', () => {
    useUiStore.setState({
      modals: [
        {
          id: 'a',
          kind: 'confirm',
          props: {
            titleKey: 'modals:confirm.title',
            messageKey: 'modals:confirm.title',
            onConfirm: () => {},
          },
        },
        { id: 'b', kind: 'error', props: { messageKey: 'common:save' } },
      ],
    })
    render(<ModalStack />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })
})
