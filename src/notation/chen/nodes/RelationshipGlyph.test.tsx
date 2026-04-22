import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { RelationshipGlyph } from './RelationshipGlyph'

const base = {
  name: 'owns',
  width: 140,
  height: 70,
  isSelected: false,
  warningSeverity: 'none' as const,
}

describe('RelationshipGlyph', () => {
  it('renders a polygon (diamond) with the relationship name', () => {
    const { container, getByText } = render(
      <svg>
        <RelationshipGlyph {...base} isIdentifying={false} />
      </svg>,
    )
    expect(container.querySelector('polygon')).toBeInTheDocument()
    expect(getByText('owns')).toBeInTheDocument()
  })

  it('identifying relationship renders two polygons (double diamond)', () => {
    const { container } = render(
      <svg>
        <RelationshipGlyph {...base} isIdentifying />
      </svg>,
    )
    expect(container.querySelectorAll('polygon').length).toBe(2)
  })

  it('non-identifying renders a single polygon', () => {
    const { container } = render(
      <svg>
        <RelationshipGlyph {...base} isIdentifying={false} />
      </svg>,
    )
    expect(container.querySelectorAll('polygon').length).toBe(1)
  })

  it('sets data-selected when isSelected', () => {
    const { container } = render(
      <svg>
        <RelationshipGlyph {...base} isIdentifying={false} isSelected />
      </svg>,
    )
    expect(container.querySelector('[data-selected="true"]')).toBeInTheDocument()
  })

  it('renders a warning badge when severity is not none', () => {
    const { container } = render(
      <svg>
        <RelationshipGlyph {...base} isIdentifying={false} warningSeverity="warning" />
      </svg>,
    )
    expect(container.querySelector('[data-role="warning-badge"]')).toBeInTheDocument()
  })
})
