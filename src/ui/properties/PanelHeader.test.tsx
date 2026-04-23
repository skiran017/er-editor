import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PanelHeader } from './PanelHeader'
import { useSelectionStore } from '@/state/selectionStore'
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
    render(<PanelHeader titleKey="kind.entity" />)
    expect(screen.getByText('Entity')).toBeInTheDocument()
  })

  it('close button clears the selection', async () => {
    render(<PanelHeader titleKey="kind.entity" />)
    await userEvent.click(screen.getByRole('button', { name: /close properties/i }))
    expect(useSelectionStore.getState().selectedNodeIds.size).toBe(0)
  })
})
