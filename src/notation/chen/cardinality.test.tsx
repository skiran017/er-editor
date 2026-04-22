import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { CardinalityLabel } from './cardinality'

const render2 = (ui: React.ReactElement) => render(<svg>{ui}</svg>)

describe('CardinalityLabel', () => {
  it('renders the cardinality text', () => {
    const { getByText } = render2(
      <CardinalityLabel cardinality="N" participation="partial" x={10} y={20} />,
    )
    expect(getByText('N')).toBeInTheDocument()
  })

  it('renders a filled disc for total participation', () => {
    const { container } = render2(
      <CardinalityLabel cardinality="1" participation="total" x={0} y={0} />,
    )
    const circle = container.querySelector('circle[data-role="participation-marker"]')
    expect(circle).toBeInTheDocument()
    expect(circle?.getAttribute('data-participation')).toBe('total')
  })

  it('renders a hollow ring for partial participation', () => {
    const { container } = render2(
      <CardinalityLabel cardinality="1" participation="partial" x={0} y={0} />,
    )
    const circle = container.querySelector('circle[data-role="participation-marker"]')
    expect(circle?.getAttribute('data-participation')).toBe('partial')
    expect(circle?.getAttribute('fill')).toMatch(/none|white/i)
  })

  it('positions the label at (x, y)', () => {
    const { container } = render2(
      <CardinalityLabel cardinality="M" participation="partial" x={42} y={99} />,
    )
    const group = container.querySelector('g[data-role="cardinality-label"]')
    expect(group?.getAttribute('transform')).toContain('translate(42, 99)')
  })
})
