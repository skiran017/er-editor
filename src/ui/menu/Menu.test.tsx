import { describe, it, expect, beforeEach, beforeAll, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Menu } from './Menu'
import { useUiStore } from '@/state/uiStore'
import { useValidationStore } from '@/state/validationStore'
import { useDiagramStore } from '@/state/diagramStore'
import { useInteractionStore } from '@/interaction/interactionStore'
import { emptyDiagram } from '@/domain/types'
import { initI18n } from '@/platform/i18n'

beforeAll(async () => { await initI18n() })

const reset = () => {
  useUiStore.setState({
    theme: 'system', language: 'en',
    panels: { properties: true, minimap: false },
    modals: [], toasts: [], contextMenu: null, inlineRename: null,
    readonly: false,
  })
  useValidationStore.setState({ errorsById: {}, enabled: true })
  useDiagramStore.setState({ diagram: emptyDiagram() })
  useDiagramStore.temporal.getState().clear()
  useInteractionStore.getState().send({ type: 'PICK_TOOL', tool: 'select' })
}

describe('Menu — hamburger dropdown', () => {
  beforeEach(reset)

  it('starts closed — the dropdown is not in the DOM until toggled', () => {
    render(<Menu />)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('clicking the hamburger opens the dropdown with the expected sections', async () => {
    render(<Menu />)
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }))
    expect(screen.getByRole('menu')).toBeInTheDocument()
    // File actions surfaced.
    expect(screen.getByRole('menuitem', { name: /Open/ })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /Save/ })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /Keyboard shortcuts/ })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /Reset/ })).toBeInTheDocument()
    // Theme radiogroup.
    expect(screen.getByRole('radiogroup', { name: /Theme/ })).toBeInTheDocument()
    // Language radiogroup.
    expect(screen.getByRole('radiogroup', { name: /Language/ })).toBeInTheDocument()
  })

  it('clicking IT in the language toggle writes "it" to uiStore.language', async () => {
    render(<Menu />)
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }))
    await userEvent.click(screen.getByRole('radio', { name: /italian/i }))
    expect(useUiStore.getState().language).toBe('it')
  })

  it('Phase-5 file actions push an info toast with the "not yet available" key', async () => {
    render(<Menu />)
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }))
    await userEvent.click(screen.getByRole('menuitem', { name: /Open/ }))
    const toasts = useUiStore.getState().toasts
    expect(toasts).toHaveLength(1)
    expect(toasts[0]!.kind).toBe('info')
    expect(toasts[0]!.messageKey).toBe('menu:notYetAvailable')
  })

  it('validation toggle writes to the validation store', async () => {
    render(<Menu />)
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }))
    const toggle = screen.getByRole('checkbox', { name: 'Validation' })
    expect(toggle).toBeChecked()
    await userEvent.click(toggle)
    expect(useValidationStore.getState().enabled).toBe(false)
  })

  it('theme radios change the ui store theme', async () => {
    render(<Menu />)
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Dark' }))
    expect(useUiStore.getState().theme).toBe('dark')
  })

  it('keyboard shortcuts item dispatches TOGGLE_CHEATSHEET through the FSM', async () => {
    const sendSpy = vi.spyOn(useInteractionStore.getState(), 'send')
    render(<Menu />)
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }))
    await userEvent.click(screen.getByRole('menuitem', { name: /Keyboard shortcuts/ }))
    expect(sendSpy.mock.calls.some(([e]) => (e as { type: string }).type === 'TOGGLE_CHEATSHEET')).toBe(true)
    sendSpy.mockRestore()
  })

  it('reset canvas empties the diagram store when the user confirms', async () => {
    useDiagramStore.getState().addNode({
      kind: 'entity', name: 'E', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    expect(useDiagramStore.getState().diagram.nodeOrder).toHaveLength(1)
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<Menu />)
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }))
    await userEvent.click(screen.getByRole('menuitem', { name: /Reset/ }))
    expect(useDiagramStore.getState().diagram.nodeOrder).toHaveLength(0)
    confirmSpy.mockRestore()
  })

  it('reset canvas is a no-op when the user declines the confirm', async () => {
    useDiagramStore.getState().addNode({
      kind: 'entity', name: 'E', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<Menu />)
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }))
    await userEvent.click(screen.getByRole('menuitem', { name: /Reset/ }))
    expect(useDiagramStore.getState().diagram.nodeOrder).toHaveLength(1)
    confirmSpy.mockRestore()
  })
})

describe('Menu — readonly mode', () => {
  beforeEach(reset)
  afterEach(() => useUiStore.setState({ readonly: false }))

  it('hides the Reset row when uiStore.readonly is true', async () => {
    const user = userEvent.setup()
    useUiStore.setState({ readonly: true })
    render(<Menu />)
    await user.click(screen.getByRole('button', { name: /menu/i }))
    expect(screen.queryByRole('menuitem', { name: /reset/i })).toBeNull()
  })
})

describe('Menu — exam mode', () => {
  beforeEach(reset)

  it('shows the exam-mode banner at the top of the dropdown', async () => {
    useUiStore.getState().setExamMode(true)
    render(<Menu />)
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }))
    expect(screen.getByText(/Exam mode/)).toBeInTheDocument()
    expect(screen.getByRole('menu')).toHaveAttribute('data-exam-mode', 'true')
  })

  it('hides Open / Save / Export Image entirely (no DOM element to bypass via devtools)', async () => {
    useUiStore.getState().setExamMode(true)
    render(<Menu />)
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }))
    expect(screen.queryByRole('menuitem', { name: /Open/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /Save/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: /Export PNG/ })).not.toBeInTheDocument()
  })

  it('hides the Validation toggle entirely under exam mode', async () => {
    useUiStore.getState().setExamMode(true)
    render(<Menu />)
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }))
    expect(screen.queryByRole('checkbox', { name: 'Validation' })).not.toBeInTheDocument()
  })

  it('leaves Shortcuts, Theme, and Reset untouched (UX is not gated)', async () => {
    useUiStore.getState().setExamMode(true)
    render(<Menu />)
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }))
    expect(screen.getByRole('menuitem', { name: /Keyboard shortcuts/ })).not.toBeDisabled()
    expect(screen.getByRole('radio', { name: 'Dark' })).not.toBeDisabled()
    expect(screen.getByRole('menuitem', { name: /Reset/ })).not.toBeDisabled()
  })
})
