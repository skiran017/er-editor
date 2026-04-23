import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import {
  ReactFlow,
  ReactFlowProvider,
  Position,
  type Edge,
  type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { ISAEdge } from './ISAEdge'
import { useDiagramStore } from '@/state/diagramStore'
import { emptyDiagram } from '@/domain/types'

const edgeTypes = { 'isa-link': ISAEdge }

const resetStores = () => {
  useDiagramStore.setState({ diagram: emptyDiagram() })
  useDiagramStore.temporal.getState().clear()
}

const renderInFlow = (nodes: Node[], edges: Edge[]) =>
  render(
    <ReactFlowProvider>
      <div style={{ width: 400, height: 300 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          edgeTypes={edgeTypes}
          fitView={false}
        />
      </div>
    </ReactFlowProvider>,
  )

const mkHandles = (w: number, h: number) => [
  { type: 'source' as const, position: Position.Right, x: w, y: h / 2, width: 1, height: 1 },
  { type: 'target' as const, position: Position.Left, x: 0, y: h / 2, width: 1, height: 1 },
]

// Build a minimal RF-shaped node spec. Tests only assert on path presence +
// data-role markers, so handle geometry just needs to exist, not be correct.
const mkRfNode = (id: string, x: number, y: number, w = 100, h = 60): Node => ({
  id, type: 'default',
  position: { x, y }, data: {},
  width: w, height: h,
  handles: mkHandles(w, h),
})

const mkRfEdge = (id: string, source: string, target: string): Edge => ({
  id, source, target, type: 'isa-link', data: { edgeId: id },
})

describe('ISAEdge — basics', () => {
  beforeEach(resetStores)

  it('renders an isa-link edge with the stored role', async () => {
    const isa = useDiagramStore.getState().addNode({
      kind: 'isa', isTotal: false,
      position: { x: 0, y: 0 }, size: { width: 100, height: 60 },
    })
    const child = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'SubType', isWeak: false,
      position: { x: 200, y: 0 }, size: { width: 120, height: 60 },
    })
    const eid = useDiagramStore.getState().addEdge({
      kind: 'isa-link', sourceId: isa, targetId: child,
      role: 'child', waypoints: [],
    })
    const { container } = renderInFlow(
      [mkRfNode(isa, 0, 0), mkRfNode(child, 200, 0, 120)],
      [mkRfEdge(eid, isa, child)],
    )
    await new Promise((r) => setTimeout(r, 50))
    const wrapper = container.querySelector('.react-flow__edge-isa-link')
    expect(wrapper).toBeInTheDocument()
    const path = wrapper?.querySelector('path.react-flow__edge-path')
    expect(path).toBeInTheDocument()
    expect(path?.getAttribute('data-role')).toBe('child')
  })
})

describe('ISAEdge — total-generalization double line', () => {
  beforeEach(resetStores)

  it('renders the parent edge as a DOUBLE line when the ISA is total', async () => {
    const isa = useDiagramStore.getState().addNode({
      kind: 'isa', isTotal: true,
      position: { x: 0, y: 100 }, size: { width: 100, height: 60 },
    })
    const parent = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'SuperType', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const eid = useDiagramStore.getState().addEdge({
      kind: 'isa-link', sourceId: parent, targetId: isa,
      role: 'parent', waypoints: [],
    })
    const { container } = renderInFlow(
      [mkRfNode(parent, 0, 0, 120), mkRfNode(isa, 0, 100)],
      [mkRfEdge(eid, parent, isa)],
    )
    await new Promise((r) => setTimeout(r, 50))
    // Stroke-in-stroke: the base path + a canvas-bg overlay path tagged with
    // data-role="total-generalization" carve a gap through the middle.
    expect(container.querySelector('[data-role="total-generalization"]')).toBeInTheDocument()
  })

  it('child edges remain a SINGLE line even when the ISA is total', async () => {
    const isa = useDiagramStore.getState().addNode({
      kind: 'isa', isTotal: true,
      position: { x: 0, y: 0 }, size: { width: 100, height: 60 },
    })
    const child = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'SubType', isWeak: false,
      position: { x: 200, y: 0 }, size: { width: 120, height: 60 },
    })
    const eid = useDiagramStore.getState().addEdge({
      kind: 'isa-link', sourceId: isa, targetId: child,
      role: 'child', waypoints: [],
    })
    const { container } = renderInFlow(
      [mkRfNode(isa, 0, 0), mkRfNode(child, 200, 0, 120)],
      [mkRfEdge(eid, isa, child)],
    )
    await new Promise((r) => setTimeout(r, 50))
    expect(container.querySelector('[data-role="total-generalization"]')).not.toBeInTheDocument()
  })
})
