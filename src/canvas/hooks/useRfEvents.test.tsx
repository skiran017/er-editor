import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import type { Edge as RfEdge, Node as RfNode } from '@xyflow/react'
import { useRfEvents } from './useRfEvents'
import { useInteractionStore } from '@/interaction/interactionStore'

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
    const { result } = renderHook(() => useRfEvents())
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

  it('onEdgeClick dispatches EDGE_POINTER_DOWN with the edge id', () => {
    const { result } = renderHook(() => useRfEvents())
    const sendSpy = vi.spyOn(useInteractionStore.getState(), 'send')
    const fakeEdge = { id: 'edge-1' } as RfEdge
    result.current.onEdgeClick(mkMouseEvent(), fakeEdge)
    const call = sendSpy.mock.calls.find(([ev]) => ev.type === 'EDGE_POINTER_DOWN')
    expect(call).toBeDefined()
    expect((call![0] as { edgeId: string }).edgeId).toBe('edge-1')
    sendSpy.mockRestore()
  })

  it('onPaneClick dispatches CANVAS_POINTER_DOWN followed by CANVAS_POINTER_UP', () => {
    const { result } = renderHook(() => useRfEvents())
    const sendSpy = vi.spyOn(useInteractionStore.getState(), 'send')
    result.current.onPaneClick(mkMouseEvent({ clientX: 50, clientY: 60 }))
    const types = sendSpy.mock.calls.map(([ev]) => ev.type)
    // Sequence must include DOWN then UP, in that order.
    const downIdx = types.indexOf('CANVAS_POINTER_DOWN')
    const upIdx = types.indexOf('CANVAS_POINTER_UP')
    expect(downIdx).toBeGreaterThanOrEqual(0)
    expect(upIdx).toBeGreaterThan(downIdx)
    sendSpy.mockRestore()
  })

  it('onNodeClick maps middle/right mouse buttons to PointerButton', () => {
    const { result } = renderHook(() => useRfEvents())
    const sendSpy = vi.spyOn(useInteractionStore.getState(), 'send')
    result.current.onNodeClick(mkMouseEvent({ button: 2 }), { id: 'n' } as RfNode)
    const call = sendSpy.mock.calls.find(([ev]) => ev.type === 'NODE_POINTER_DOWN')
    expect((call![0] as { button: string }).button).toBe('right')
    sendSpy.mockRestore()
  })
})
