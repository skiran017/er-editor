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
import { EntityRelationshipEdge } from './EntityRelationshipEdge'
import { useDiagramStore } from '@/state/diagramStore'
import { emptyDiagram } from '@/domain/types'

const edgeTypes = { 'entity-relationship': EntityRelationshipEdge }

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

describe('EntityRelationshipEdge container', () => {
  beforeEach(resetStores)

  it('renders an entity-relationship edge with cardinality + dashed path for partial', async () => {
    const srcId = useDiagramStore.getState().addNode({
      kind: 'entity',
      name: 'A',
      isWeak: false,
      position: { x: 0, y: 0 },
      size: { width: 120, height: 60 },
    })
    const tgtId = useDiagramStore.getState().addNode({
      kind: 'relationship',
      name: 'r',
      isIdentifying: false,
      position: { x: 300, y: 0 },
      size: { width: 140, height: 70 },
    })
    const eid = useDiagramStore.getState().addEdge({
      kind: 'entity-relationship',
      sourceId: srcId,
      targetId: tgtId,
      cardinality: 'N',
      participation: 'partial',
      waypoints: [],
    })

    const mkHandles = (w: number, h: number) => [
      { type: 'source' as const, position: Position.Right, x: w, y: h / 2, width: 1, height: 1 },
      { type: 'target' as const, position: Position.Left, x: 0, y: h / 2, width: 1, height: 1 },
    ]
    const rfNodes: Node[] = [
      {
        id: srcId,
        type: 'default',
        position: { x: 0, y: 0 },
        data: {},
        width: 120,
        height: 60,
        handles: mkHandles(120, 60),
      },
      {
        id: tgtId,
        type: 'default',
        position: { x: 300, y: 0 },
        data: {},
        width: 140,
        height: 70,
        handles: mkHandles(140, 70),
      },
    ]
    const rfEdges: Edge[] = [
      {
        id: eid,
        source: srcId,
        target: tgtId,
        type: 'entity-relationship',
        data: { edgeId: eid },
      },
    ]

    const { container, findByText } = renderInFlow(rfNodes, rfEdges)
    expect(await findByText('N', {}, { timeout: 2000 })).toBeInTheDocument()
    // BaseEdge renders the solid primary path.
    const path = container.querySelector(
      '.react-flow__edge-entity-relationship path.react-flow__edge-path',
    ) as SVGPathElement | null
    expect(path).toBeInTheDocument()
    // Partial participation is now the absence of a parallel line — the
    // double line only renders when participation === 'total'. Verify no
    // double-line sibling exists.
    const parallel = container.querySelector(
      '.react-flow__edge-entity-relationship path[data-role="total-participation"]',
    )
    expect(parallel).not.toBeInTheDocument()
  })

  it('returns null when the edge id is missing from the store (stale RF frame)', async () => {
    const rfNodes: Node[] = [
      {
        id: 'a',
        type: 'default',
        position: { x: 0, y: 0 },
        data: {},
        width: 120,
        height: 60,
      },
      {
        id: 'b',
        type: 'default',
        position: { x: 300, y: 0 },
        data: {},
        width: 120,
        height: 60,
      },
    ]
    const rfEdges: Edge[] = [
      {
        id: 'orphan',
        source: 'a',
        target: 'b',
        type: 'entity-relationship',
        data: { edgeId: 'orphan' },
      },
    ]
    const { container } = renderInFlow(rfNodes, rfEdges)
    await new Promise((r) => setTimeout(r, 0))
    // Stale edge (no diagram entry) → component returns null → no path inside
    // the RF wrapper (wrapper may still exist but has no path).
    const path = container.querySelector(
      '.react-flow__edge-entity-relationship path.react-flow__edge-path',
    )
    expect(path).not.toBeInTheDocument()
  })
})
