import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
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
    // Three groups totalling 9 tools: select, pan, entity, relationship, attribute, isa, connect, quickRelationship, quickGeneralization.
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBe(9)
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
})
