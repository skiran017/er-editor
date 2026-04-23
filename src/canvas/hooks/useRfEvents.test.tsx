import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { ReactFlowProvider, type Edge as RfEdge, type Node as RfNode } from '@xyflow/react'
import { useRfEvents } from './useRfEvents'
import { useInteractionStore } from '@/interaction/interactionStore'
import { useDiagramStore } from '@/state/diagramStore'
import { useUiStore } from '@/state/uiStore'
import { emptyDiagram } from '@/domain/types'

// useRfEvents calls useReactFlow(); with no <ReactFlow> mounted,
// screenToFlowPosition returns the input unchanged, so assertions that
// expect the raw clientX/clientY are still correct.
const RF_OPTS = { wrapper: ReactFlowProvider } as const

const mkMouseEvent = (overrides: Partial<MouseEvent> = {}): ReactMouseEvent => ({
  clientX: 10, clientY: 20,
  shiftKey: false, ctrlKey: false, altKey: false, metaKey: false,
  button: 0,
  ...overrides,
} as unknown as ReactMouseEvent)

const reset = () => {
  useInteractionStore.getState().send({ type: 'PICK_TOOL', tool: 'select' })
}

beforeEach(reset)

describe('useRfEvents', () => {
  it('onNodeClick dispatches NODE_POINTER_DOWN with the node id, point, button, modifiers', () => {
    const { result } = renderHook(() => useRfEvents(), RF_OPTS)
    const sendSpy = vi.spyOn(useInteractionStore.getState(), 'send')
    const fakeNode = { id: 'node-1' } as RfNode
    result.current.onNodeClick(mkMouseEvent({ clientX: 100, clientY: 200, shiftKey: true }), fakeNode)
    const call = sendSpy.mock.calls.find(([ev]) => ev.type === 'NODE_POINTER_DOWN')
    expect(call).toBeDefined()
    const ev = call![0] as {
      type: string; nodeId: string; point: { x: number; y: number };
      button: string; modifiers: { shift: boolean; ctrl: boolean; alt: boolean; meta: boolean }
    }
    expect(ev.nodeId).toBe('node-1')
    expect(ev.point).toEqual({ x: 100, y: 200 })
    expect(ev.button).toBe('left')
    expect(ev.modifiers).toEqual({ shift: true, ctrl: false, alt: false, meta: false })
    sendSpy.mockRestore()
  })

  it('onNodeClick dispatches EXACTLY two events in order: NODE_POINTER_DOWN then CANVAS_POINTER_UP (at the same point)', () => {
    // Regression: React Flow fires onNodeClick AFTER mouseup, but our FSM
    // expects a matching UP after every DOWN to leave `maybeDragging`.
    // Without the synthetic UP the next mouse move crossed the drag
    // threshold and the node tracked the cursor (drag-follow bug).
    const { result } = renderHook(() => useRfEvents(), RF_OPTS)
    const sendSpy = vi.spyOn(useInteractionStore.getState(), 'send')
    const fakeNode = { id: 'node-1' } as RfNode
    result.current.onNodeClick(mkMouseEvent({ clientX: 42, clientY: 84 }), fakeNode)
    expect(sendSpy).toHaveBeenCalledTimes(2)
    const first = sendSpy.mock.calls[0]![0] as { type: string; point: { x: number; y: number } }
    const second = sendSpy.mock.calls[1]![0] as { type: string; point: { x: number; y: number } }
    expect(first.type).toBe('NODE_POINTER_DOWN')
    expect(second.type).toBe('CANVAS_POINTER_UP')
    expect(second.point).toEqual({ x: 42, y: 84 })
    sendSpy.mockRestore()
  })

  it('onEdgeClick dispatches EDGE_POINTER_DOWN with the edge id', () => {
    const { result } = renderHook(() => useRfEvents(), RF_OPTS)
    const sendSpy = vi.spyOn(useInteractionStore.getState(), 'send')
    const fakeEdge = { id: 'edge-1' } as RfEdge
    result.current.onEdgeClick(mkMouseEvent(), fakeEdge)
    const call = sendSpy.mock.calls.find(([ev]) => ev.type === 'EDGE_POINTER_DOWN')
    expect(call).toBeDefined()
    expect((call![0] as { edgeId: string }).edgeId).toBe('edge-1')
    sendSpy.mockRestore()
  })

  it('onEdgeClick also dispatches EXACTLY two events in order: EDGE_POINTER_DOWN then CANVAS_POINTER_UP', () => {
    const { result } = renderHook(() => useRfEvents(), RF_OPTS)
    const sendSpy = vi.spyOn(useInteractionStore.getState(), 'send')
    result.current.onEdgeClick(mkMouseEvent({ clientX: 7, clientY: 11 }), { id: 'edge-1' } as RfEdge)
    expect(sendSpy).toHaveBeenCalledTimes(2)
    expect((sendSpy.mock.calls[0]![0] as { type: string }).type).toBe('EDGE_POINTER_DOWN')
    expect((sendSpy.mock.calls[1]![0] as { type: string }).type).toBe('CANVAS_POINTER_UP')
    sendSpy.mockRestore()
  })

  it('does NOT expose onPaneClick (pane events bubble to the wrapper div where useMouse handles them)', () => {
    const { result } = renderHook(() => useRfEvents(), RF_OPTS)
    // Guards against a regression where onPaneClick gets re-added and
    // double-fires CANVAS_POINTER_* alongside the outer-wrapper useMouse
    // handler (caused the "two stacked entities" bug).
    expect((result.current as unknown as { onPaneClick?: unknown }).onPaneClick).toBeUndefined()
  })

  it('onNodeClick maps middle/right mouse buttons to PointerButton', () => {
    const { result } = renderHook(() => useRfEvents(), RF_OPTS)
    const sendSpy = vi.spyOn(useInteractionStore.getState(), 'send')
    result.current.onNodeClick(mkMouseEvent({ button: 2 }), { id: 'n' } as RfNode)
    const call = sendSpy.mock.calls.find(([ev]) => ev.type === 'NODE_POINTER_DOWN')
    expect((call![0] as { button: string }).button).toBe('right')
    sendSpy.mockRestore()
  })

  it('onNodeDoubleClick opens the inline rename overlay with the node name (Bug 4)', () => {
    useDiagramStore.setState({ diagram: emptyDiagram() })
    useUiStore.getState().cancelInlineRename()
    const id = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'Customer', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const { result } = renderHook(() => useRfEvents(), RF_OPTS)
    result.current.onNodeDoubleClick(mkMouseEvent(), { id } as unknown as RfNode)
    expect(useUiStore.getState().inlineRename).toEqual({
      nodeId: id, initialValue: 'Customer',
    })
  })

  it('onNodeDoubleClick is a no-op for ISA nodes (they have no name)', () => {
    useDiagramStore.setState({ diagram: emptyDiagram() })
    useUiStore.getState().cancelInlineRename()
    const id = useDiagramStore.getState().addNode({
      kind: 'isa', isTotal: false,
      position: { x: 0, y: 0 }, size: { width: 100, height: 60 },
    })
    const { result } = renderHook(() => useRfEvents(), RF_OPTS)
    result.current.onNodeDoubleClick(mkMouseEvent(), { id } as unknown as RfNode)
    expect(useUiStore.getState().inlineRename).toBeNull()
  })

  it('onNodeDoubleClick is a no-op for an unknown node id', () => {
    useDiagramStore.setState({ diagram: emptyDiagram() })
    useUiStore.getState().cancelInlineRename()
    const { result } = renderHook(() => useRfEvents(), RF_OPTS)
    result.current.onNodeDoubleClick(mkMouseEvent(), { id: 'does-not-exist' } as RfNode)
    expect(useUiStore.getState().inlineRename).toBeNull()
  })
})
