import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PanelHeader } from './PanelHeader'
import { useSelectionStore } from '@/state/selectionStore'
import { useInteractionStore } from '@/interaction/interactionStore'
import type { NodeId } from '@/domain/types'
import { initI18n } from '@/platform/i18n'

beforeAll(async () => {
  await initI18n()
})

const reset = () => {
  useSelectionStore.setState({
    selectedNodeIds: new Set<NodeId>(['n1' as NodeId]),
    selectedEdgeIds: new Set(),
    rubberband: null,
  })
}

describe('PanelHeader', () => {
  beforeEach(reset)

  it('renders the localized title', () => {
    render(<PanelHeader titleKey="kind.entity" kind="entity" />)
    expect(screen.getByText('Entity')).toBeInTheDocument()
  })

  it('close button clears the selection', async () => {
    render(<PanelHeader titleKey="kind.entity" kind="entity" />)
    await userEvent.click(screen.getByRole('button', { name: /close properties/i }))
    expect(useSelectionStore.getState().selectedNodeIds.size).toBe(0)
  })

  it('delete button dispatches the DELETE event through the FSM', async () => {
    const sendSpy = vi.spyOn(useInteractionStore.getState(), 'send')
    render(<PanelHeader titleKey="kind.entity" kind="entity" />)
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(sendSpy.mock.calls.some(([e]) => (e as { type: string }).type === 'DELETE')).toBe(true)
    sendSpy.mockRestore()
  })

  it('stamps the kind on the header element for styling hooks', () => {
    const { container } = render(<PanelHeader titleKey="kind.relationship" kind="relationship" />)
    expect(container.querySelector('[data-role="panel-header"]')).toHaveAttribute(
      'data-kind',
      'relationship',
    )
  })
})
