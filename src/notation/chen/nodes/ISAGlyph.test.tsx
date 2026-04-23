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
  it('always renders a single polygon — isTotal drives the edge, not the glyph', () => {
    const partial = render(
      <svg>
        <ISAGlyph {...base} isTotal={false} />
      </svg>,
    )
    expect(partial.container.querySelectorAll('polygon').length).toBe(1)
    partial.unmount()

    const total = render(
      <svg>
        <ISAGlyph {...base} isTotal />
      </svg>,
    )
    // No inner triangle — the total marker moved onto the parent-ISA edge
    // as a double line. The glyph shape is identical in both states.
    expect(total.container.querySelectorAll('polygon').length).toBe(1)
  })

  it('renders an "ISA" text label inside the triangle', () => {
    const { container } = render(
      <svg>
        <ISAGlyph {...base} isTotal={false} />
      </svg>,
    )
    const text = container.querySelector('text')
    expect(text?.textContent).toBe('ISA')
  })

  it('triangle is inverted — base along the top, apex at the bottom-centre', () => {
    const { container } = render(
      <svg>
        <ISAGlyph {...base} isTotal={false} />
      </svg>,
    )
    const pts =
      container.querySelector('polygon')?.getAttribute('points')?.trim().split(/\s+/) ?? []
    expect(pts).toHaveLength(3)
    const [top1, top2, apex] = pts.map((p) => p.split(',').map(Number))
    // Top-left + top-right share y=0 (the base). Apex sits below at y=height.
    expect(top1[1]).toBe(0)
    expect(top2[1]).toBe(0)
    expect(apex[1]).toBeGreaterThan(top1[1])
    // Apex is horizontally centred.
    expect(apex[0]).toBe(base.width / 2)
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
