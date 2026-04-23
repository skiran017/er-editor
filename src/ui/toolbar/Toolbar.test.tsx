import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Toolbar } from './Toolbar'
import { useInteractionStore } from '@/interaction/interactionStore'
import { initI18n } from '@/platform/i18n'

beforeAll(async () => { await initI18n() })

const reset = () => {
  useInteractionStore.getState().send({ type: 'PICK_TOOL', tool: 'select' })
}

describe('Toolbar', () => {
  beforeEach(reset)

  it('renders a button for each tool in chenPlugin.tools', () => {
    render(<Toolbar />)
    // Select (2) + Elements (4) + Connections (6: connect + three quick
    // relationship variants + partial/total ISA) = 12.
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBe(12)
  })

  it('clicking "Entity" dispatches PICK_TOOL with tool=entity', async () => {
    render(<Toolbar />)
    await userEvent.click(screen.getByRole('button', { name: 'Entity' }))
    expect(useInteractionStore.getState().snapshot.context.tool).toBe('entity')
  })

  it('active tool reflects FSM state via aria-pressed', async () => {
    render(<Toolbar />)
    await userEvent.click(screen.getByRole('button', { name: 'Entity' }))
    expect(screen.getByRole('button', { name: 'Entity' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Select' })).not.toHaveAttribute('aria-pressed', 'true')
  })

  it('element tools (entity/relationship/attribute/isa) are draggable', () => {
    const { container } = render(<Toolbar />)
    for (const tool of ['entity', 'relationship', 'attribute', 'isa']) {
      expect(container.querySelector(`[data-tool-id="${tool}"][draggable="true"]`)).toBeInTheDocument()
    }
  })

  it('non-element tools (select/pan/connect) are not draggable', () => {
    const { container } = render(<Toolbar />)
    for (const tool of ['select', 'pan', 'connect']) {
      expect(container.querySelector(`[data-tool-id="${tool}"][draggable="true"]`)).not.toBeInTheDocument()
    }
  })

  it('dragging a draggable element tool writes the tool id to dataTransfer', () => {
    const { container } = render(<Toolbar />)
    const entityDrag = container.querySelector('[data-tool-id="entity"][draggable="true"]') as HTMLElement
    expect(entityDrag).toBeInTheDocument()
    // Build a minimal dataTransfer polyfill — jsdom doesn't set one on DragEvent by default.
    const store = new Map<string, string>()
    const dataTransfer = {
      setData: (key: string, value: string) => { store.set(key, value) },
      getData: (key: string) => store.get(key) ?? '',
      effectAllowed: 'uninitialized' as string,
    }
    fireEvent.dragStart(entityDrag, { dataTransfer })
    expect(store.get('application/x-er-tool')).toBe('entity')
  })
})
