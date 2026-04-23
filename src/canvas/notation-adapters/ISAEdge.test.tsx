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

describe('ISAEdge container', () => {
  beforeEach(resetStores)

  it('renders an isa-link edge with the stored role', async () => {
    const isa = useDiagramStore.getState().addNode({
      kind: 'isa',
      isTotal: false,
      position: { x: 0, y: 0 },
      size: { width: 100, height: 60 },
    })
    const child = useDiagramStore.getState().addNode({
      kind: 'entity',
      name: 'SubType',
      isWeak: false,
      position: { x: 200, y: 0 },
      size: { width: 120, height: 60 },
    })
    const eid = useDiagramStore.getState().addEdge({
      kind: 'isa-link',
      sourceId: isa,
      targetId: child,
      role: 'child',
      waypoints: [],
    })

    const mkHandles = (w: number, h: number) => [
      {
        type: 'source' as const,
        position: Position.Right,
        x: w,
        y: h / 2,
        width: 1,
        height: 1,
      },
      {
        type: 'target' as const,
        position: Position.Left,
        x: 0,
        y: h / 2,
        width: 1,
        height: 1,
      },
    ]
    const rfNodes: Node[] = [
      {
        id: isa,
        type: 'default',
        position: { x: 0, y: 0 },
        data: {},
        width: 100,
        height: 60,
        handles: mkHandles(100, 60),
      },
      {
        id: child,
        type: 'default',
        position: { x: 200, y: 0 },
        data: {},
        width: 120,
        height: 60,
        handles: mkHandles(120, 60),
      },
    ]
    const rfEdges: Edge[] = [
      {
        id: eid,
        source: isa,
        target: child,
        type: 'isa-link',
        data: { edgeId: eid },
      },
    ]

    const { container } = renderInFlow(rfNodes, rfEdges)
    await new Promise((r) => setTimeout(r, 50))
    // BaseEdge renders <path> inside RF's wrapper <g.react-flow__edge-isa-link>
    const wrapper = container.querySelector('.react-flow__edge-isa-link')
    expect(wrapper).toBeInTheDocument()
    const path = wrapper?.querySelector('path.react-flow__edge-path')
    expect(path).toBeInTheDocument()
    expect(path?.getAttribute('data-role')).toBe('child')
  })
})
