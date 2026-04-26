import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RelationshipLegRow } from './RelationshipLegRow'
import { useDiagramStore } from '@/state/diagramStore'
import { useUiStore } from '@/state/uiStore'
import { useSelectionStore } from '@/state/selectionStore'
import { emptyDiagram, type EntityNode, type EntityRelationshipEdge, type NodeId, type EdgeId } from '@/domain/types'
import { initI18n } from '@/platform/i18n'

beforeAll(async () => { await initI18n() })

const minimalEntity: EntityNode = {
  id: 'e1' as NodeId,
  kind: 'entity',
  name: 'Person',
  isWeak: false,
  position: { x: 0, y: 0 },
  size: { width: 120, height: 60 },
}

const minimalEdge: EntityRelationshipEdge = {
  id: 'ed1' as EdgeId,
  kind: 'entity-relationship',
  sourceId: 'e1' as NodeId,
  targetId: 'r1' as NodeId,
  cardinality: '1',
  participation: 'partial',
  waypoints: [],
}

const reset = () => {
  useDiagramStore.setState({ diagram: emptyDiagram() })
  useDiagramStore.temporal.getState().clear()
  useSelectionStore.setState({ selectedNodeIds: new Set(), selectedEdgeIds: new Set(), rubberband: null })
  useUiStore.setState({ readonly: false })
}

beforeEach(reset)
afterEach(() => { useUiStore.setState({ readonly: false }) })

describe('RelationshipLegRow — readonly mode', () => {
  it('disables cardinality and participation selects when readonly is true', () => {
    useUiStore.setState({ readonly: true })
    render(
      <RelationshipLegRow
        edge={minimalEdge}
        entity={minimalEntity}
        isRecursive={false}
        index={0}
      />,
    )

    const cardinality = screen.getByRole('combobox', { name: 'Cardinality' })
    const participation = screen.getByRole('combobox', { name: 'Participation' })
    expect(cardinality).toBeDisabled()
    expect(participation).toBeDisabled()
  })

  it('enables cardinality and participation selects when readonly is false', () => {
    render(
      <RelationshipLegRow
        edge={minimalEdge}
        entity={minimalEntity}
        isRecursive={false}
        index={0}
      />,
    )

    const cardinality = screen.getByRole('combobox', { name: 'Cardinality' })
    const participation = screen.getByRole('combobox', { name: 'Participation' })
    expect(cardinality).not.toBeDisabled()
    expect(participation).not.toBeDisabled()
  })

  it('disables the role input on a recursive edge when readonly is true', () => {
    useUiStore.setState({ readonly: true })
    render(
      <RelationshipLegRow
        edge={minimalEdge}
        entity={minimalEntity}
        isRecursive={true}
        index={0}
      />,
    )

    const roleInput = screen.getByRole('textbox', { name: 'Role' })
    expect(roleInput).toBeDisabled()
  })
})
