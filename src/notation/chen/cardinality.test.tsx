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

  it('exposes participation as data-participation on the label group (total)', () => {
    // Visual participation is now drawn by the edge component (double line),
    // not by a marker on the label. The label still carries the attribute
    // so tests / CSS can target it if needed.
    const { container } = render2(
      <CardinalityLabel cardinality="1" participation="total" x={0} y={0} />,
    )
    const group = container.querySelector('g[data-role="cardinality-label"]')
    expect(group?.getAttribute('data-participation')).toBe('total')
  })

  it('exposes participation as data-participation on the label group (partial)', () => {
    const { container } = render2(
      <CardinalityLabel cardinality="1" participation="partial" x={0} y={0} />,
    )
    const group = container.querySelector('g[data-role="cardinality-label"]')
    expect(group?.getAttribute('data-participation')).toBe('partial')
  })

  it('positions the label at (x, y)', () => {
    const { container } = render2(
      <CardinalityLabel cardinality="M" participation="partial" x={42} y={99} />,
    )
    const group = container.querySelector('g[data-role="cardinality-label"]')
    expect(group?.getAttribute('transform')).toContain('translate(42, 99)')
  })
})
