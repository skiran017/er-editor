import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastStack } from './ToastStack'
import { useUiStore } from '@/state/uiStore'
import { initI18n } from '@/platform/i18n'

beforeAll(async () => { await initI18n() })

const reset = () => {
  useUiStore.setState({ toasts: [] })
}

describe('ToastStack', () => {
  beforeEach(reset)

  it('renders nothing when there are no toasts', () => {
    const { container } = render(<ToastStack />)
    expect(container.querySelector('[data-role="toast-stack"]')).not.toBeInTheDocument()
  })

  it('renders one toast per entry in uiStore.toasts', () => {
    useUiStore.setState({ toasts: [
      { id: '1', kind: 'success', messageKey: 'common:save' },
      { id: '2', kind: 'error', messageKey: 'common:close' },
    ]})
    render(<ToastStack />)
    expect(screen.getAllByRole('alert')).toHaveLength(2)
  })

  it('dismiss button removes a toast from the store', async () => {
    useUiStore.setState({ toasts: [{ id: '1', kind: 'error', messageKey: 'common:save' }] })
    render(<ToastStack />)
    await userEvent.click(screen.getByLabelText('Dismiss notification'))
    expect(useUiStore.getState().toasts).toEqual([])
  })

  it('auto-dismisses non-error toasts after their timeout', () => {
    vi.useFakeTimers()
    useUiStore.setState({ toasts: [{ id: '1', kind: 'success', messageKey: 'common:save' }] })
    render(<ToastStack />)
    expect(useUiStore.getState().toasts).toHaveLength(1)
    act(() => { vi.advanceTimersByTime(4001) })
    expect(useUiStore.getState().toasts).toEqual([])
    vi.useRealTimers()
  })

  it('does not auto-dismiss error toasts', () => {
    vi.useFakeTimers()
    useUiStore.setState({ toasts: [{ id: '1', kind: 'error', messageKey: 'common:save' }] })
    render(<ToastStack />)
    act(() => { vi.advanceTimersByTime(60_000) })
    expect(useUiStore.getState().toasts).toHaveLength(1)
    vi.useRealTimers()
  })
})
