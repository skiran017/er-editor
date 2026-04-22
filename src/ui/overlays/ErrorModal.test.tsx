import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ErrorModal } from './ErrorModal'
import { useUiStore } from '@/state/uiStore'
import { initI18n } from '@/platform/i18n'

beforeAll(async () => { await initI18n() })

const reset = () => { useUiStore.setState({ modals: [] }) }

describe('ErrorModal', () => {
  beforeEach(reset)

  it('renders with role=alertdialog', () => {
    render(<ErrorModal modalId="x" messageKey="common:save" />)
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('optional detail renders inside <pre>', () => {
    const { container } = render(
      <ErrorModal modalId="x" messageKey="common:save" detail="stack trace here" />,
    )
    expect(container.querySelector('pre')).toHaveTextContent('stack trace here')
  })

  it('dismiss button pops the modal', async () => {
    useUiStore.setState({ modals: [{ id: 'x', kind: 'error', props: {} }] })
    render(<ErrorModal modalId="x" messageKey="common:save" />)
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(useUiStore.getState().modals).toEqual([])
  })
})
