import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  type NodeChange,
  type EdgeChange,
  type Viewport,
  type NodeTypes,
  type EdgeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useDiagramStore } from '@/state/diagramStore'
import { useViewportStore } from '@/state/viewportStore'
import { diagramToRf } from './adapters/diagramToRf'
import { rfToDiagramPatch } from './adapters/rfToDiagramPatch'
import { useKeyboard, useMouse, useTouch, useSnapping, useToolbarDrop, useRfEvents } from './hooks'
import type { SnapGuide } from '@/domain/snap'
import type { NodeId } from '@/domain/types'
import { chenNodeTypes, chenEdgeTypes } from './notation-adapters/chenBindings'
import { InlineRenameOverlay } from './InlineRenameOverlay'

// chenBindings exports `Record<NodeKind, ComponentType<NodeProps>>` — structurally
// compatible with React-Flow's `NodeTypes` at runtime, but TS is stricter about the
// `type: string` discriminant. Coerce once at the boundary.
const NODE_TYPES = chenNodeTypes as unknown as NodeTypes
const EDGE_TYPES = chenEdgeTypes as unknown as EdgeTypes

interface SnapOverlayProps {
  readonly guides: readonly SnapGuide[]
  readonly pan: { readonly x: number; readonly y: number }
  readonly zoom: number
}

const SnapOverlay = ({ guides, pan, zoom }: SnapOverlayProps) => {
  if (guides.length === 0) return null
  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{
        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        transformOrigin: '0 0',
      }}
      data-role="snap-overlay"
    >
      {guides.map((g, i) => (
        <line
          key={i}
          x1={g.from.x}
          y1={g.from.y}
          x2={g.to.x}
          y2={g.to.y}
          stroke="#f59e0b"
          strokeWidth={1}
          strokeDasharray="4 4"
          data-role="snap-guide"
          data-orientation={g.orientation}
        />
      ))}
    </svg>
  )
}

export const ERCanvas = () => (
  <ReactFlowProvider>
    <ERCanvasInner />
  </ReactFlowProvider>
)

const ERCanvasInner = () => {
  const diagram = useDiagramStore((s) => s.diagram)
  const zoom = useViewportStore((s) => s.zoom)
  const pan = useViewportStore((s) => s.pan)
  const { applySnap } = useSnapping()

  useKeyboard()
  const mouse = useMouse()
  const touch = useTouch()
  const toolbarDrop = useToolbarDrop()

  const [activeGuides, setActiveGuides] = useState<readonly SnapGuide[]>([])
  const dragging = useRef(false)

  const { nodes, edges } = useMemo(() => diagramToRf(diagram), [diagram])

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const snappedChanges: NodeChange[] = []
      const liveGuides: SnapGuide[] = []
      for (const c of changes) {
        if (c.type === 'position' && c.position) {
          const r = applySnap(c.id as NodeId, c.position)
          snappedChanges.push({ ...c, position: r.position })
          liveGuides.push(...r.guides)
          dragging.current = !!c.dragging
        } else {
          snappedChanges.push(c)
        }
      }
      setActiveGuides(dragging.current ? liveGuides : [])
      const patch = rfToDiagramPatch(snappedChanges, [])
      if (patch.updateNodes?.length || patch.removeNodes?.length) {
        useDiagramStore.getState().applyPatch(patch)
      }
    },
    [applySnap],
  )

  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    const patch = rfToDiagramPatch([], changes)
    if (patch.removeEdges?.length) useDiagramStore.getState().applyPatch(patch)
  }, [])

  const handleViewportChange = useCallback((v: Viewport) => {
    useViewportStore.setState({ zoom: v.zoom, pan: { x: v.x, y: v.y } })
  }, [])

  // React Flow v12 swallows pointer events on its internal node/edge wrappers
  // before they bubble to the outer wrapper div's useMouse handler. useRfEvents
  // wires handlers onto <ReactFlow> directly so the FSM receives
  // NODE/EDGE/CANVAS events.
  const rfEvents = useRfEvents()

  useEffect(() => {
    const onUp = () => {
      dragging.current = false
      setActiveGuides([])
    }
    window.addEventListener('pointerup', onUp)
    return () => window.removeEventListener('pointerup', onUp)
  }, [])

  return (
    <div
      className="h-full w-full flex-1 relative"
      onPointerDown={(e) => {
        mouse.onPointerDown(e)
        touch.onPointerDown(e)
      }}
      onPointerMove={(e) => {
        mouse.onPointerMove(e)
        touch.onPointerMove(e)
      }}
      onPointerUp={(e) => {
        mouse.onPointerUp(e)
        touch.onPointerUp(e)
      }}
      onWheel={(e) => {
        mouse.onWheel(e)
      }}
      onDragOver={toolbarDrop.onDragOver}
      onDrop={toolbarDrop.onDrop}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        defaultEdgeOptions={{ type: 'smoothstep' }}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onNodeClick={rfEvents.onNodeClick}
        onEdgeClick={rfEvents.onEdgeClick}
        onPaneClick={rfEvents.onPaneClick}
        viewport={{ x: pan.x, y: pan.y, zoom }}
        onViewportChange={handleViewportChange}
        nodesConnectable={false}
        panOnDrag={false}
        fitView={false}
      >
        <Background />
        <Controls />
      </ReactFlow>
      <SnapOverlay guides={activeGuides} pan={pan} zoom={zoom} />
      <InlineRenameOverlay />
    </div>
  )
}
