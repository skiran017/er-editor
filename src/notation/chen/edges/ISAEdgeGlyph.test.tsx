import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ISAEdgeGlyph } from './ISAEdgeGlyph'

describe('ISAEdgeGlyph', () => {
  it('renders a path tagged with data-kind="isa-link"', () => {
    const { container } = render(
      <svg>
        <ISAEdgeGlyph path="M 0 0 L 10 10" role="parent" />
      </svg>,
    )
    expect(container.querySelector('[data-kind="isa-link"]')).toBeInTheDocument()
  })

  it('sets data-role on the rendered group for downstream styling', () => {
    const { container } = render(
      <svg>
        <ISAEdgeGlyph path="M 0 0 L 10 10" role="child" />
      </svg>,
    )
    expect(
      container.querySelector('[data-kind="isa-link"]')?.getAttribute('data-role'),
    ).toBe('child')
  })
})
