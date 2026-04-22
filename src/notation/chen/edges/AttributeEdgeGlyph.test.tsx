import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { AttributeEdgeGlyph } from './AttributeEdgeGlyph'

describe('AttributeEdgeGlyph', () => {
  it('renders a solid path from source to target', () => {
    const { container } = render(
      <svg>
        <AttributeEdgeGlyph path="M 0 0 L 50 50" />
      </svg>,
    )
    const p = container.querySelector('path')
    expect(p?.getAttribute('d')).toBe('M 0 0 L 50 50')
    expect(p?.getAttribute('stroke-dasharray')).toBeFalsy()
  })

  it('is tagged with data-kind="attribute-of"', () => {
    const { container } = render(
      <svg>
        <AttributeEdgeGlyph path="M 0 0 L 10 0" />
      </svg>,
    )
    expect(
      container.querySelector('[data-kind="attribute-of"]'),
    ).toBeInTheDocument()
  })
})
