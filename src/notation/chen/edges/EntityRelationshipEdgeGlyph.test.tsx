import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { EntityRelationshipEdgeGlyph } from './EntityRelationshipEdgeGlyph'

const base = { path: 'M 0 0 L 100 0', labelX: 80, labelY: 0 }

describe('EntityRelationshipEdgeGlyph', () => {
  it('renders the given path', () => {
    const { container } = render(
      <svg>
        <EntityRelationshipEdgeGlyph
          {...base}
          cardinality="N"
          participation="partial"
        />
      </svg>,
    )
    const path = container.querySelector('path')
    expect(path?.getAttribute('d')).toBe('M 0 0 L 100 0')
  })

  it('total participation renders a solid path (no stroke-dasharray)', () => {
    const { container } = render(
      <svg>
        <EntityRelationshipEdgeGlyph
          {...base}
          cardinality="1"
          participation="total"
        />
      </svg>,
    )
    const path = container.querySelector('path')
    expect(path?.getAttribute('stroke-dasharray')).toBeFalsy()
  })

  it('partial participation renders a dashed path', () => {
    const { container } = render(
      <svg>
        <EntityRelationshipEdgeGlyph
          {...base}
          cardinality="1"
          participation="partial"
        />
      </svg>,
    )
    const path = container.querySelector('path')
    expect(path?.getAttribute('stroke-dasharray')).toBeTruthy()
  })

  it('renders a CardinalityLabel at (labelX, labelY)', () => {
    const { container, getByText } = render(
      <svg>
        <EntityRelationshipEdgeGlyph
          {...base}
          cardinality="M"
          participation="partial"
        />
      </svg>,
    )
    expect(getByText('M')).toBeInTheDocument()
    const g = container.querySelector('g[data-role="cardinality-label"]')
    expect(g?.getAttribute('transform')).toContain('translate(80, 0)')
  })

  it('renders role text when role is provided', () => {
    const { getByText } = render(
      <svg>
        <EntityRelationshipEdgeGlyph
          {...base}
          cardinality="1"
          participation="partial"
          role="manages"
        />
      </svg>,
    )
    expect(getByText('manages')).toBeInTheDocument()
  })

  it('omits role text when role is undefined', () => {
    const { queryByText } = render(
      <svg>
        <EntityRelationshipEdgeGlyph
          {...base}
          cardinality="1"
          participation="partial"
        />
      </svg>,
    )
    expect(queryByText(/manages/)).toBeNull()
  })
})
