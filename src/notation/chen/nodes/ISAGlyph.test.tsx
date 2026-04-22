import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ISAGlyph } from './ISAGlyph'

const base = {
  width: 100,
  height: 60,
  isSelected: false,
  warningSeverity: 'none' as const,
}

describe('ISAGlyph', () => {
  it('partial generalization renders a single polygon', () => {
    const { container } = render(
      <svg>
        <ISAGlyph {...base} isTotal={false} />
      </svg>,
    )
    expect(container.querySelectorAll('polygon').length).toBe(1)
  })

  it('total generalization renders two polygons (double triangle)', () => {
    const { container } = render(
      <svg>
        <ISAGlyph {...base} isTotal />
      </svg>,
    )
    expect(container.querySelectorAll('polygon').length).toBe(2)
  })

  it('triangle points downward (top-left, top-right, bottom-centre)', () => {
    const { container } = render(
      <svg>
        <ISAGlyph {...base} isTotal={false} />
      </svg>,
    )
    const pts =
      container.querySelector('polygon')?.getAttribute('points')?.trim().split(/\s+/) ?? []
    expect(pts).toHaveLength(3)
    const [top1, top2, bottom] = pts.map((p) => p.split(',').map(Number))
    expect(top1[1]).toBeLessThan(bottom[1])
    expect(top2[1]).toBeLessThan(bottom[1])
  })

  it('sets data-selected when isSelected', () => {
    const { container } = render(
      <svg>
        <ISAGlyph {...base} isTotal={false} isSelected />
      </svg>,
    )
    expect(container.querySelector('[data-selected="true"]')).toBeInTheDocument()
  })

  it('renders a warning badge when severity is not none', () => {
    const { container } = render(
      <svg>
        <ISAGlyph {...base} isTotal={false} warningSeverity="error" />
      </svg>,
    )
    expect(container.querySelector('[data-role="warning-badge"]')).toBeInTheDocument()
  })
})
