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
import { AttributeEdge } from './AttributeEdge'
import { useDiagramStore } from '@/state/diagramStore'
import { emptyDiagram } from '@/domain/types'

const edgeTypes = { 'attribute-of': AttributeEdge }

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

describe('AttributeEdge container', () => {
  beforeEach(resetStores)

  it('renders when an attribute-of edge is present in the store', async () => {
    const entity = useDiagramStore.getState().addNode({
      kind: 'entity',
      name: 'A',
      isWeak: false,
      position: { x: 0, y: 0 },
      size: { width: 120, height: 60 },
    })
    const attr = useDiagramStore.getState().addNode({
      kind: 'attribute',
      name: 'id',
      isKey: true,
      isDiscriminant: false,
      isMultivalued: false,
      isDerived: false,
      isComposite: false,
      position: { x: 200, y: 0 },
      size: { width: 90, height: 50 },
    })
    const eid = useDiagramStore.getState().addEdge({
      kind: 'attribute-of',
      sourceId: attr,
      targetId: entity,
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
        id: entity,
        type: 'default',
        position: { x: 0, y: 0 },
        data: {},
        width: 120,
        height: 60,
        handles: mkHandles(120, 60),
      },
      {
        id: attr,
        type: 'default',
        position: { x: 200, y: 0 },
        data: {},
        width: 90,
        height: 50,
        handles: mkHandles(90, 50),
      },
    ]
    const rfEdges: Edge[] = [
      {
        id: eid,
        source: attr,
        target: entity,
        type: 'attribute-of',
        data: { edgeId: eid },
      },
    ]

    const { container } = renderInFlow(rfNodes, rfEdges)
    await new Promise((r) => setTimeout(r, 50))
    // BaseEdge renders a <path> inside RF's wrapper <g.react-flow__edge-attribute-of>
    const wrapper = container.querySelector('.react-flow__edge-attribute-of')
    expect(wrapper).toBeInTheDocument()
    expect(wrapper?.querySelector('path.react-flow__edge-path')).toBeInTheDocument()
  })
})
