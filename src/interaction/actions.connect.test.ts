import { describe, it, expect, beforeEach } from 'vitest'
import { connectNodes } from './actions'
import { useDiagramStore } from '@/state/diagramStore'
import { useSelectionStore } from '@/state/selectionStore'
import { useViewportStore } from '@/state/viewportStore'
import { useUiStore } from '@/state/uiStore'
import { emptyDiagram } from '@/domain/types'
import { initialContext, type EditorContext } from './context'
import { NO_MODIFIERS } from './events'

const withContext = (patch: Partial<EditorContext> = {}): EditorContext =>
  ({ ...initialContext, ...patch })

const resetStores = () => {
  useDiagramStore.setState({ diagram: emptyDiagram() })
  useDiagramStore.temporal.getState().clear()
  useSelectionStore.setState({
    selectedNodeIds: new Set(), selectedEdgeIds: new Set(), rubberband: null,
  })
  useViewportStore.setState({ zoom: 1, pan: { x: 0, y: 0 } })
  useUiStore.setState({
    theme: 'system', language: 'en',
    panels: { properties: true, minimap: false },
    modals: [], toasts: [],
  })
}

// Tests for `connectViaConnectTool` entity↔attribute handling. Lives in its
// own file to keep actions.test.ts under the 350-line lint cap.
describe('actions — connectNodes (connect tool, attribute flows)', () => {
  beforeEach(resetStores)

  it('attribute → entity: creates attribute-of with attribute as source', () => {
    const store = useDiagramStore.getState()
    const attr = store.addNode({
      kind: 'attribute', name: 'name', isKey: false, isDiscriminant: false,
      isMultivalued: false, isDerived: false, isComposite: false,
      position: { x: 0, y: 0 }, size: { width: 90, height: 50 },
    })
    const ent = store.addNode({
      kind: 'entity', name: 'E', isWeak: false,
      position: { x: 200, y: 0 }, size: { width: 120, height: 60 },
    })
    connectNodes(
      withContext({ tool: 'connect', connectionFromId: attr }),
      { type: 'NODE_POINTER_DOWN', nodeId: ent, point: { x: 260, y: 30 }, modifiers: NO_MODIFIERS, button: 'left' },
    )
    const d = useDiagramStore.getState().diagram
    expect(d.edgeOrder).toHaveLength(1)
    const edge = d.edgesById[d.edgeOrder[0]!]!
    expect(edge.kind).toBe('attribute-of')
    expect(edge.sourceId).toBe(attr)
    expect(edge.targetId).toBe(ent)
  })

  it('entity → attribute: flips so attribute is source (domain INV-2/3)', () => {
    const store = useDiagramStore.getState()
    const ent = store.addNode({
      kind: 'entity', name: 'E', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const attr = store.addNode({
      kind: 'attribute', name: 'name', isKey: false, isDiscriminant: false,
      isMultivalued: false, isDerived: false, isComposite: false,
      position: { x: 200, y: 0 }, size: { width: 90, height: 50 },
    })
    connectNodes(
      withContext({ tool: 'connect', connectionFromId: ent }),
      { type: 'NODE_POINTER_DOWN', nodeId: attr, point: { x: 245, y: 25 }, modifiers: NO_MODIFIERS, button: 'left' },
    )
    const d = useDiagramStore.getState().diagram
    expect(d.edgeOrder).toHaveLength(1)
    const edge = d.edgesById[d.edgeOrder[0]!]!
    expect(edge.kind).toBe('attribute-of')
    expect(edge.sourceId).toBe(attr)
    expect(edge.targetId).toBe(ent)
  })

})

// ISA flows live in their own describe block so each callback stays under
// the 100-line arrow-function lint cap.
describe('actions — connectNodes (connect tool, ISA flows)', () => {
  beforeEach(resetStores)

  it('ISA → entity (connect tool): creates an isa-link child edge', () => {
    const store = useDiagramStore.getState()
    const isa = store.addNode({
      kind: 'isa', isTotal: false,
      position: { x: 0, y: 0 }, size: { width: 100, height: 60 },
    })
    const ent = store.addNode({
      kind: 'entity', name: 'Sub', isWeak: false,
      position: { x: 200, y: 0 }, size: { width: 120, height: 60 },
    })
    connectNodes(
      withContext({ tool: 'connect', connectionFromId: isa }),
      { type: 'NODE_POINTER_DOWN', nodeId: ent, point: { x: 260, y: 30 }, modifiers: NO_MODIFIERS, button: 'left' },
    )
    const d = useDiagramStore.getState().diagram
    expect(d.edgeOrder).toHaveLength(1)
    const edge = d.edgesById[d.edgeOrder[0]!]!
    expect(edge.kind).toBe('isa-link')
    expect(edge.kind === 'isa-link' && edge.role).toBe('child')
    expect(edge.sourceId).toBe(isa)
    expect(edge.targetId).toBe(ent)
  })

  it('entity → ISA (connect tool): flips direction so the ISA is source, role=child', () => {
    const store = useDiagramStore.getState()
    const ent = store.addNode({
      kind: 'entity', name: 'Sub', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const isa = store.addNode({
      kind: 'isa', isTotal: false,
      position: { x: 200, y: 0 }, size: { width: 100, height: 60 },
    })
    connectNodes(
      withContext({ tool: 'connect', connectionFromId: ent }),
      { type: 'NODE_POINTER_DOWN', nodeId: isa, point: { x: 245, y: 25 }, modifiers: NO_MODIFIERS, button: 'left' },
    )
    const d = useDiagramStore.getState().diagram
    expect(d.edgeOrder).toHaveLength(1)
    const edge = d.edgesById[d.edgeOrder[0]!]!
    expect(edge.kind).toBe('isa-link')
    expect(edge.sourceId).toBe(isa)
    expect(edge.targetId).toBe(ent)
    expect(edge.kind === 'isa-link' && edge.role).toBe('child')
  })
})

describe('actions — connectNodes (connect tool, attribute flows continued)', () => {
  beforeEach(resetStores)

  it('relationship → attribute: flips so attribute is source', () => {
    const store = useDiagramStore.getState()
    const rel = store.addNode({
      kind: 'relationship', name: 'R', isIdentifying: false,
      position: { x: 0, y: 0 }, size: { width: 140, height: 70 },
    })
    const attr = store.addNode({
      kind: 'attribute', name: 'since', isKey: false, isDiscriminant: false,
      isMultivalued: false, isDerived: false, isComposite: false,
      position: { x: 200, y: 0 }, size: { width: 90, height: 50 },
    })
    connectNodes(
      withContext({ tool: 'connect', connectionFromId: rel }),
      { type: 'NODE_POINTER_DOWN', nodeId: attr, point: { x: 245, y: 25 }, modifiers: NO_MODIFIERS, button: 'left' },
    )
    const d = useDiagramStore.getState().diagram
    expect(d.edgeOrder).toHaveLength(1)
    const edge = d.edgesById[d.edgeOrder[0]!]!
    expect(edge.kind).toBe('attribute-of')
    expect(edge.sourceId).toBe(attr)
    expect(edge.targetId).toBe(rel)
  })
})
