import { describe, it, expect, beforeEach } from 'vitest'
import { useDiagramStore } from './diagramStore'
import { emptyDiagram } from '@/domain/types'
import type { NodeInput } from './types'

const baseEntityInput = (name = 'E'): Extract<NodeInput, { kind: 'entity' }> => ({
  kind: 'entity',
  name,
  isWeak: false,
  position: { x: 0, y: 0 },
  size: { width: 120, height: 60 },
})

const baseAttributeInput = (name = 'attr'): Extract<NodeInput, { kind: 'attribute' }> => ({
  kind: 'attribute',
  name,
  isKey: false,
  isDiscriminant: false,
  isMultivalued: false,
  isDerived: false,
  isComposite: false,
  position: { x: 0, y: 0 },
  size: { width: 90, height: 50 },
})

describe('diagramStore — initial state', () => {
  beforeEach(() => {
    useDiagramStore.setState({ diagram: emptyDiagram() })
    useDiagramStore.temporal.getState().clear()
  })

  it('starts with an empty diagram at schemaVersion 1', () => {
    const d = useDiagramStore.getState().diagram
    expect(d.schemaVersion).toBe(1)
    expect(d.nodeOrder).toEqual([])
    expect(d.edgeOrder).toEqual([])
  })
})

describe('diagramStore — addNode', () => {
  beforeEach(() => {
    useDiagramStore.setState({ diagram: emptyDiagram() })
    useDiagramStore.temporal.getState().clear()
  })

  it('appends to nodesById + nodeOrder and returns the new id', () => {
    const id = useDiagramStore.getState().addNode(baseEntityInput('Student'))
    const d = useDiagramStore.getState().diagram
    expect(d.nodeOrder).toEqual([id])
    expect(d.nodesById[id]).toMatchObject({ id, kind: 'entity', name: 'Student' })
  })

  it('returned ids are unique across calls', () => {
    const a = useDiagramStore.getState().addNode(baseEntityInput('A'))
    const b = useDiagramStore.getState().addNode(baseEntityInput('B'))
    expect(a).not.toBe(b)
  })
})

describe('diagramStore — updateNode', () => {
  beforeEach(() => {
    useDiagramStore.setState({ diagram: emptyDiagram() })
    useDiagramStore.temporal.getState().clear()
  })

  it('merges the patch into the existing node', () => {
    const id = useDiagramStore.getState().addNode(baseEntityInput('Old'))
    useDiagramStore.getState().updateNode(id, { name: 'New' })
    expect(useDiagramStore.getState().diagram.nodesById[id]).toMatchObject({ name: 'New' })
  })

  it('is a no-op for unknown id', () => {
    const before = useDiagramStore.getState().diagram
    useDiagramStore.getState().updateNode('missing00z' as never, { position: { x: 9, y: 9 } })
    expect(useDiagramStore.getState().diagram).toEqual(before)
  })
})

describe('diagramStore — moveNode / resizeNode', () => {
  beforeEach(() => {
    useDiagramStore.setState({ diagram: emptyDiagram() })
    useDiagramStore.temporal.getState().clear()
  })

  it('moveNode updates position only', () => {
    const id = useDiagramStore.getState().addNode(baseEntityInput('X'))
    useDiagramStore.getState().moveNode(id, { x: 100, y: 50 })
    const n = useDiagramStore.getState().diagram.nodesById[id]!
    expect(n.position).toEqual({ x: 100, y: 50 })
    expect(n.size).toEqual({ width: 120, height: 60 })
  })

  it('resizeNode updates size only', () => {
    const id = useDiagramStore.getState().addNode(baseEntityInput('X'))
    useDiagramStore.getState().resizeNode(id, { width: 200, height: 100 })
    const n = useDiagramStore.getState().diagram.nodesById[id]!
    expect(n.size).toEqual({ width: 200, height: 100 })
  })
})

describe('diagramStore — removeNode', () => {
  beforeEach(() => {
    useDiagramStore.setState({ diagram: emptyDiagram() })
    useDiagramStore.temporal.getState().clear()
  })

  it('removes from nodesById and nodeOrder', () => {
    const id = useDiagramStore.getState().addNode(baseEntityInput('X'))
    useDiagramStore.getState().removeNode(id)
    expect(useDiagramStore.getState().diagram.nodesById[id]).toBeUndefined()
    expect(useDiagramStore.getState().diagram.nodeOrder).toEqual([])
  })

  it('cascades to incident edges', () => {
    const store = useDiagramStore.getState()
    const eid = store.addNode(baseEntityInput('E'))
    const aid = store.addNode(baseAttributeInput('name'))
    const edgeId = store.addEdge({
      kind: 'attribute-of', sourceId: aid, targetId: eid, waypoints: [],
    })
    store.removeNode(eid)
    const d = useDiagramStore.getState().diagram
    expect(d.edgesById[edgeId]).toBeUndefined()
    expect(d.edgeOrder).not.toContain(edgeId)
  })
})

describe('diagramStore — addEdge', () => {
  beforeEach(() => {
    useDiagramStore.setState({ diagram: emptyDiagram() })
    useDiagramStore.temporal.getState().clear()
  })

  it('appends to edgesById + edgeOrder and returns id', () => {
    const store = useDiagramStore.getState()
    const a = store.addNode(baseEntityInput('A'))
    const b = store.addNode(baseEntityInput('B'))
    const rel = store.addNode({
      kind: 'relationship', name: 'R', isIdentifying: false,
      position: { x: 0, y: 0 }, size: { width: 140, height: 70 },
    })
    const id = store.addEdge({
      kind: 'entity-relationship',
      sourceId: a, targetId: rel,
      cardinality: '1', participation: 'partial',
      waypoints: [],
    })
    const d = useDiagramStore.getState().diagram
    expect(d.edgeOrder).toContain(id)
    expect(d.edgesById[id]).toMatchObject({ sourceId: a, targetId: rel })
    store.addEdge({
      kind: 'entity-relationship', sourceId: b, targetId: rel,
      cardinality: 'N', participation: 'total', waypoints: [],
    })
    expect(useDiagramStore.getState().diagram.edgeOrder).toHaveLength(2)
  })
})

describe('diagramStore — updateEdge / setWaypoints', () => {
  beforeEach(() => {
    useDiagramStore.setState({ diagram: emptyDiagram() })
    useDiagramStore.temporal.getState().clear()
  })

  it('updateEdge merges patch', () => {
    const store = useDiagramStore.getState()
    const a = store.addNode(baseEntityInput('A'))
    const b = store.addNode(baseEntityInput('B'))
    const r = store.addNode({
      kind: 'relationship', name: 'R', isIdentifying: false,
      position: { x: 0, y: 0 }, size: { width: 140, height: 70 },
    })
    const id = store.addEdge({
      kind: 'entity-relationship', sourceId: a, targetId: r,
      cardinality: '1', participation: 'partial', waypoints: [],
    })
    store.updateEdge(id, { cardinality: 'N' } as Partial<import('@/domain/types').ERLink>)
    expect(useDiagramStore.getState().diagram.edgesById[id]).toMatchObject({ cardinality: 'N' })
    void b
  })

  it('setWaypoints replaces the array', () => {
    const store = useDiagramStore.getState()
    const a = store.addNode(baseEntityInput('A'))
    const r = store.addNode({
      kind: 'relationship', name: 'R', isIdentifying: false,
      position: { x: 0, y: 0 }, size: { width: 140, height: 70 },
    })
    const id = store.addEdge({
      kind: 'entity-relationship', sourceId: a, targetId: r,
      cardinality: '1', participation: 'partial', waypoints: [],
    })
    store.setWaypoints(id, [{ x: 10, y: 10 }, { x: 20, y: 20 }])
    expect(useDiagramStore.getState().diagram.edgesById[id]!.waypoints).toEqual([
      { x: 10, y: 10 }, { x: 20, y: 20 },
    ])
  })
})

describe('diagramStore — removeEdge', () => {
  beforeEach(() => {
    useDiagramStore.setState({ diagram: emptyDiagram() })
    useDiagramStore.temporal.getState().clear()
  })

  it('removes from edgesById and edgeOrder', () => {
    const store = useDiagramStore.getState()
    const a = store.addNode(baseEntityInput('A'))
    const r = store.addNode({
      kind: 'relationship', name: 'R', isIdentifying: false,
      position: { x: 0, y: 0 }, size: { width: 140, height: 70 },
    })
    const id = store.addEdge({
      kind: 'entity-relationship', sourceId: a, targetId: r,
      cardinality: '1', participation: 'partial', waypoints: [],
    })
    store.removeEdge(id)
    const d = useDiagramStore.getState().diagram
    expect(d.edgesById[id]).toBeUndefined()
    expect(d.edgeOrder).not.toContain(id)
  })
})
