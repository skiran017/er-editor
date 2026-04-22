import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToolButton } from './ToolButton'
import { initI18n } from '@/platform/i18n'

beforeAll(async () => { await initI18n() })

describe('ToolButton', () => {
  it('renders with translated aria-label from labelKey', () => {
    render(
      <ToolButton
        toolId="entity"
        labelKey="tool.entity"
        icon={<span>E</span>}
        isActive={false}
        onPick={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Entity' })).toBeInTheDocument()
  })

  it('fires onPick with the tool id when clicked', async () => {
    const onPick = vi.fn()
    render(
      <ToolButton
        toolId="entity"
        labelKey="tool.entity"
        icon={<span>E</span>}
        isActive={false}
        onPick={onPick}
      />,
    )
    await userEvent.click(screen.getByRole('button'))
    expect(onPick).toHaveBeenCalledWith('entity')
  })

  it('reflects isActive via aria-pressed', () => {
    render(
      <ToolButton
        toolId="entity"
        labelKey="tool.entity"
        icon={<span>E</span>}
        isActive
        onPick={vi.fn()}
      />,
    )
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  })

  it('is draggable when onDragStart is provided', () => {
    const onDragStart = vi.fn()
    const { container } = render(
      <ToolButton
        toolId="entity"
        labelKey="tool.entity"
        icon={<span>E</span>}
        isActive={false}
        onPick={vi.fn()}
        onDragStart={onDragStart}
      />,
    )
    expect(container.querySelector('[draggable="true"]')).toBeInTheDocument()
  })

  it('is not draggable when onDragStart is omitted', () => {
    const { container } = render(
      <ToolButton
        toolId="entity"
        labelKey="tool.entity"
        icon={<span>E</span>}
        isActive={false}
        onPick={vi.fn()}
      />,
    )
    expect(container.querySelector('[draggable="true"]')).not.toBeInTheDocument()
  })
})
