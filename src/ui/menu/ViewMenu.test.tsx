import { describe, it, expect, beforeEach, beforeAll, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ViewMenu } from './ViewMenu'
import { useInteractionStore } from '@/interaction/interactionStore'
import { useUiStore } from '@/state/uiStore'
import { initI18n } from '@/platform/i18n'

beforeAll(async () => { await initI18n() })

let sendSpy: ReturnType<typeof vi.fn>

beforeEach(() => {
  useUiStore.setState({
    snap: { gridEnabled: false, gridSize: 10, alignmentEnabled: true, alignmentThreshold: 4 },
    panels: { properties: true, minimap: false },
  })
  sendSpy = vi.fn()
  vi.spyOn(useInteractionStore, 'getState').mockReturnValue({
    snapshot: useInteractionStore.getState().snapshot,
    send: sendSpy,
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ViewMenu', () => {
  it('lists six items when open', () => {
    render(<ViewMenu isOpen onOpen={() => {}} onClose={() => {}} />)
    // 1 trigger + 6 items = 7 menuitems
    expect(screen.getAllByRole('menuitem')).toHaveLength(7)
  })

  it('clicking "Zoom in" dispatches { type: "ZOOM_IN" }', async () => {
    render(<ViewMenu isOpen onOpen={() => {}} onClose={() => {}} />)
    await userEvent.click(screen.getByRole('menuitem', { name: /Zoom in/i }))
    expect(sendSpy).toHaveBeenCalledWith({ type: 'ZOOM_IN' })
  })

  it('toggling "Grid" flips snap.gridEnabled', async () => {
    expect(useUiStore.getState().snap.gridEnabled).toBe(false)
    render(<ViewMenu isOpen onOpen={() => {}} onClose={() => {}} />)
    await userEvent.click(screen.getByRole('menuitem', { name: /Grid/i }))
    expect(useUiStore.getState().snap.gridEnabled).toBe(true)
  })
})
