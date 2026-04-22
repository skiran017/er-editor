import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { EntityGlyph } from './EntityGlyph'

const base = {
  name: 'Person',
  width: 120,
  height: 60,
  isSelected: false,
  warningSeverity: 'none' as const,
}

describe('EntityGlyph', () => {
  it('renders a rect with the entity name', () => {
    const { container, getByText } = render(
      <svg>
        <EntityGlyph {...base} isWeak={false} />
      </svg>,
    )
    expect(container.querySelector('rect')).toBeInTheDocument()
    expect(getByText('Person')).toBeInTheDocument()
  })

  it('weak entity renders two rects (double border)', () => {
    const { container } = render(
      <svg>
        <EntityGlyph {...base} isWeak />
      </svg>,
    )
    const rects = container.querySelectorAll('rect')
    expect(rects.length).toBe(2)
  })

  it('strong entity renders a single rect', () => {
    const { container } = render(
      <svg>
        <EntityGlyph {...base} isWeak={false} />
      </svg>,
    )
    expect(container.querySelectorAll('rect').length).toBe(1)
  })

  it('sets data-selected when isSelected', () => {
    const { container } = render(
      <svg>
        <EntityGlyph {...base} isWeak={false} isSelected />
      </svg>,
    )
    expect(container.querySelector('[data-selected="true"]')).toBeInTheDocument()
  })

  it('renders a warning badge when warningSeverity != none', () => {
    const { container } = render(
      <svg>
        <EntityGlyph {...base} isWeak={false} warningSeverity="error" />
      </svg>,
    )
    expect(container.querySelector('[data-role="warning-badge"]')).toBeInTheDocument()
  })

  it('no badge when warningSeverity is none', () => {
    const { container } = render(
      <svg>
        <EntityGlyph {...base} isWeak={false} />
      </svg>,
    )
    expect(container.querySelector('[data-role="warning-badge"]')).not.toBeInTheDocument()
  })
})
