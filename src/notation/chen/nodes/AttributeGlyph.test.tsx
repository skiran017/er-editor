import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { AttributeGlyph } from './AttributeGlyph'

const base = {
  name: 'id',
  width: 90,
  height: 50,
  isSelected: false,
  warningSeverity: 'none' as const,
  isKey: false,
  isDiscriminant: false,
  isMultivalued: false,
  isDerived: false,
  isComposite: false,
}

describe('AttributeGlyph', () => {
  it('renders an ellipse with the attribute name', () => {
    const { container, getByText } = render(
      <svg>
        <AttributeGlyph {...base} />
      </svg>,
    )
    expect(container.querySelector('ellipse')).toBeInTheDocument()
    expect(getByText('id')).toBeInTheDocument()
  })

  it('multivalued renders two ellipses', () => {
    const { container } = render(
      <svg>
        <AttributeGlyph {...base} isMultivalued />
      </svg>,
    )
    expect(container.querySelectorAll('ellipse').length).toBe(2)
  })

  it('derived ellipse has stroke-dasharray', () => {
    const { container } = render(
      <svg>
        <AttributeGlyph {...base} isDerived />
      </svg>,
    )
    const ellipse = container.querySelector('ellipse[data-role="outline"]')
    expect(ellipse?.getAttribute('stroke-dasharray')).toBeTruthy()
  })

  it('key attribute underlines the name', () => {
    const { container } = render(
      <svg>
        <AttributeGlyph {...base} isKey />
      </svg>,
    )
    const text = container.querySelector('text')
    expect(text?.getAttribute('text-decoration')).toContain('underline')
    expect(text?.getAttribute('data-discriminant')).toBeNull()
  })

  it('discriminant attribute renders an explicit dashed <line> under the text (Bug 6)', () => {
    // Previously used CSS `text-decoration-style: dashed` which SVG <text>
    // doesn't honour reliably (Safari in particular). Now we draw an explicit
    // dashed line.
    const { container } = render(
      <svg>
        <AttributeGlyph {...base} isDiscriminant />
      </svg>,
    )
    const text = container.querySelector('text')
    expect(text?.getAttribute('data-discriminant')).toBe('true')
    // Discriminant no longer uses the CSS underline — only an explicit line.
    const td = text?.getAttribute('text-decoration')
    expect(td ?? '').not.toContain('underline')
    const underline = container.querySelector('[data-role="discriminant-underline"]')
    expect(underline).toBeInTheDocument()
    expect(underline?.getAttribute('stroke-dasharray')).toBe('3 2')
  })

  it('non-discriminant attribute has no discriminant-underline line', () => {
    const { container } = render(
      <svg>
        <AttributeGlyph {...base} />
      </svg>,
    )
    expect(container.querySelector('[data-role="discriminant-underline"]')).not.toBeInTheDocument()
  })

  it('key attribute does NOT render the dashed discriminant line', () => {
    const { container } = render(
      <svg>
        <AttributeGlyph {...base} isKey />
      </svg>,
    )
    expect(container.querySelector('[data-role="discriminant-underline"]')).not.toBeInTheDocument()
  })

  it('composite attribute renders a composite marker', () => {
    const { container } = render(
      <svg>
        <AttributeGlyph {...base} isComposite />
      </svg>,
    )
    expect(container.querySelector('[data-role="composite-marker"]')).toBeInTheDocument()
  })

  it('non-composite omits the composite marker', () => {
    const { container } = render(
      <svg>
        <AttributeGlyph {...base} />
      </svg>,
    )
    expect(container.querySelector('[data-role="composite-marker"]')).not.toBeInTheDocument()
  })

  it('renders a warning badge when severity is not none', () => {
    const { container } = render(
      <svg>
        <AttributeGlyph {...base} warningSeverity="warning" />
      </svg>,
    )
    expect(container.querySelector('[data-role="warning-badge"]')).toBeInTheDocument()
  })

  it('sets data-selected when isSelected', () => {
    const { container } = render(
      <svg>
        <AttributeGlyph {...base} isSelected />
      </svg>,
    )
    expect(container.querySelector('[data-selected="true"]')).toBeInTheDocument()
  })
})
