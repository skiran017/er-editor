import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSnapping } from './useSnapping'
import { useDiagramStore } from '@/state/diagramStore'
import { useUiStore } from '@/state/uiStore'
import { emptyDiagram, type NodeId } from '@/domain/types'

const resetStores = () => {
  useDiagramStore.setState({ diagram: emptyDiagram() })
  useUiStore.getState().setSnap({
    gridEnabled: false, gridSize: 10, alignmentEnabled: true, alignmentThreshold: 4,
  })
}

describe('useSnapping', () => {
  beforeEach(resetStores)

  it('applySnap with alignment off + grid off = identity', () => {
    useUiStore.getState().setSnap({ alignmentEnabled: false })
    const { result } = renderHook(() => useSnapping())
    const r = result.current.applySnap('stale' as NodeId, { x: 123, y: 456 })
    expect(r.position).toEqual({ x: 123, y: 456 })
    expect(r.guides).toEqual([])
  })

  it('applySnap with grid on rounds to nearest grid multiple', () => {
    useUiStore.getState().setSnap({ gridEnabled: true, alignmentEnabled: false })
    const id = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'A', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const { result } = renderHook(() => useSnapping())
    const r = result.current.applySnap(id, { x: 13, y: 27 })
    expect(r.position).toEqual({ x: 10, y: 30 })
  })

  it('applySnap aligns with another node centre when within threshold', () => {
    const a = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'A', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const b = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'B', isWeak: false,
      position: { x: 200, y: 200 }, size: { width: 120, height: 60 },
    })
    const { result } = renderHook(() => useSnapping())
    const r = result.current.applySnap(a, { x: 198, y: 0 })
    expect(r.position.x).toBe(200)
    expect(r.guides.length).toBeGreaterThan(0)
    expect(b).toBeDefined()
  })

  it('applySnap excludes the dragged node from the others list', () => {
    const a = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'A', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const { result } = renderHook(() => useSnapping())
    const r = result.current.applySnap(a, { x: 0, y: 0 })
    expect(r.guides).toEqual([])
  })

  it('re-reads uiStore snap config reactively', () => {
    useUiStore.getState().setSnap({ gridEnabled: false, alignmentEnabled: false })
    const { result } = renderHook(() => useSnapping())
    expect(result.current.applySnap('x' as NodeId, { x: 13, y: 27 }).position).toEqual({ x: 13, y: 27 })
    act(() => { useUiStore.getState().setSnap({ gridEnabled: true }) })
    expect(result.current.applySnap('x' as NodeId, { x: 13, y: 27 }).position).toEqual({ x: 10, y: 30 })
  })
})
