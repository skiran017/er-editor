import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AttributeRow } from './AttributeRow'
import { useDiagramStore } from '@/state/diagramStore'
import { useUiStore } from '@/state/uiStore'
import { emptyDiagram, type AttributeNode, type NodeId } from '@/domain/types'
import { initI18n } from '@/platform/i18n'

beforeAll(async () => { await initI18n() })

const baseAttribute: AttributeNode = {
  id: 'a1' as NodeId,
  kind: 'attribute',
  name: 'username',
  isKey: false,
  isDiscriminant: false,
  isMultivalued: false,
  isDerived: false,
  isComposite: false,
  position: { x: 0, y: 0 },
  size: { width: 90, height: 50 },
}

beforeEach(() => {
  useDiagramStore.setState({ diagram: emptyDiagram() })
  useDiagramStore.temporal.getState().clear()
  useUiStore.setState({ readonly: false })
})

afterEach(() => {
  useUiStore.setState({ readonly: false })
})

describe('AttributeRow — readonly mode', () => {
  it('disables the name input and chip checkboxes when readonly is true', () => {
    useUiStore.setState({ readonly: true })
    render(<AttributeRow attribute={baseAttribute} />)

    // Name text input is disabled
    expect(screen.getByRole('textbox', { name: 'Name' })).toBeDisabled()

    // All four chip checkboxes (Key, Discriminant, Multivalued, Derived) are disabled
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes.length).toBeGreaterThan(0)
    for (const cb of checkboxes) expect(cb).toBeDisabled()
  })

  it('hides the delete-attribute button when readonly is true', () => {
    useUiStore.setState({ readonly: true })
    render(<AttributeRow attribute={baseAttribute} />)

    // The delete button is conditionally rendered only when !readonly
    expect(screen.queryByRole('button', { name: 'Delete attribute' })).toBeNull()
  })

  it('shows the delete-attribute button when readonly is false', () => {
    render(<AttributeRow attribute={baseAttribute} />)

    expect(screen.getByRole('button', { name: 'Delete attribute' })).toBeInTheDocument()
  })

  it('enables the name input and chip checkboxes when readonly is false', () => {
    render(<AttributeRow attribute={baseAttribute} />)

    expect(screen.getByRole('textbox', { name: 'Name' })).not.toBeDisabled()

    const checkboxes = screen.getAllByRole('checkbox')
    for (const cb of checkboxes) expect(cb).not.toBeDisabled()
  })
})
