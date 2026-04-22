import { describe, it, expect, beforeEach } from 'vitest'
import {
  selectNodeById, selectIncidentEdges, selectSelectedNodes, selectErrorsForId, pickSeverity,
} from './selectors'
import { useDiagramStore } from './diagramStore'
import { useSelectionStore } from './selectionStore'
import { useValidationStore } from './validationStore'
import { emptyDiagram } from '@/domain/types'
import type { ValidationError } from '@/domain/types'
import type { NodeInput } from './types'
import { asNodeId } from '@/domain/id'

const entity = (name = 'E'): Extract<NodeInput, { kind: 'entity' }> => ({
  kind: 'entity', name, isWeak: false,
  position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
})

const reset = () => {
  useDiagramStore.setState({ diagram: emptyDiagram() })
  useDiagramStore.temporal.getState().clear()
  useSelectionStore.setState({
    selectedNodeIds: new Set(), selectedEdgeIds: new Set(), rubberband: null,
  })
  useValidationStore.setState({ errorsById: {}, enabled: true })
}

describe('selectors', () => {
  beforeEach(reset)

  it('selectNodeById returns the node or undefined', () => {
    const id = useDiagramStore.getState().addNode(entity('A'))
    expect(selectNodeById(id)(useDiagramStore.getState())).toMatchObject({ name: 'A' })
    expect(selectNodeById(asNodeId('missing_01'))(useDiagramStore.getState())).toBeUndefined()
  })

  it('selectIncidentEdges returns edges touching the node id', () => {
    const store = useDiagramStore.getState()
    const a = store.addNode(entity('A'))
    const b = store.addNode(entity('B'))
    const r = store.addNode({
      kind: 'relationship', name: 'R', isIdentifying: false,
      position: { x: 0, y: 0 }, size: { width: 140, height: 70 },
    })
    store.addEdge({
      kind: 'entity-relationship', sourceId: a, targetId: r,
      cardinality: '1', participation: 'partial', waypoints: [],
    })
    store.addEdge({
      kind: 'entity-relationship', sourceId: b, targetId: r,
      cardinality: 'N', participation: 'total', waypoints: [],
    })
    const edges = selectIncidentEdges(r)(useDiagramStore.getState())
    expect(edges).toHaveLength(2)
  })

  it('selectSelectedNodes reads from BOTH diagram and selection stores', () => {
    const store = useDiagramStore.getState()
    const a = store.addNode(entity('A'))
    const b = store.addNode(entity('B'))
    useSelectionStore.getState().select({ nodes: [a], edges: [] })
    const nodes = selectSelectedNodes()
    expect(nodes).toHaveLength(1)
    expect(nodes[0]!.id).toBe(a)
    void b
  })

  it('selectErrorsForId returns the array or empty', () => {
    useValidationStore.getState().setErrors([
      { ruleId: 'r1', severity: 'error', targetId: asNodeId('n000000001'), messageKey: 'm' },
    ])
    const errs = selectErrorsForId(asNodeId('n000000001'))(useValidationStore.getState())
    expect(errs).toHaveLength(1)
    expect(
      selectErrorsForId(asNodeId('missing_01'))(useValidationStore.getState())
    ).toEqual([])
  })
})

describe('selectors — memoisation', () => {
  beforeEach(reset)

  it('selectNodeById returns the same reference when state does not change', () => {
    const id = useDiagramStore.getState().addNode(entity('A'))
    const fn = selectNodeById(id)
    const first = fn(useDiagramStore.getState())
    const second = fn(useDiagramStore.getState())
    expect(first).toBe(second)
  })

  it('selectIncidentEdges returns a fresh array when the diagram changes', () => {
    const store = useDiagramStore.getState()
    const a = store.addNode(entity('A'))
    const before = selectIncidentEdges(a)(useDiagramStore.getState())
    store.updateNode(a, { name: 'Changed' })
    const after = selectIncidentEdges(a)(useDiagramStore.getState())
    // Different references because store updated.
    expect(before).not.toBe(after)
    // But length stays 0 (node has no edges).
    expect(after).toEqual([])
  })
})

describe('pickSeverity', () => {
  const mkErr = (severity: 'error' | 'warning'): ValidationError => ({
    ruleId: 'r', severity, targetId: asNodeId('n000000001'), messageKey: 'm',
  })

  it('returns "none" for undefined input', () => {
    expect(pickSeverity(undefined)).toBe('none')
  })

  it('returns "none" for an empty array', () => {
    expect(pickSeverity([])).toBe('none')
  })

  it('returns "warning" when only warnings are present', () => {
    expect(pickSeverity([mkErr('warning'), mkErr('warning')])).toBe('warning')
  })

  it('returns "error" for a mix of warnings and errors', () => {
    expect(pickSeverity([mkErr('warning'), mkErr('error')])).toBe('error')
  })

  it('returns "error" when only errors are present', () => {
    expect(pickSeverity([mkErr('error')])).toBe('error')
  })
})
