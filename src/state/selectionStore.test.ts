import { describe, it, expect, beforeEach } from 'vitest'
import { useSelectionStore } from './selectionStore'
import { asNodeId, asEdgeId } from '@/domain/id'

const n1 = asNodeId('node000001')
const n2 = asNodeId('node000002')
const n3 = asNodeId('node000003')
const e1 = asEdgeId('edge000001')

const reset = () =>
  useSelectionStore.setState({
    selectedNodeIds: new Set(),
    selectedEdgeIds: new Set(),
    rubberband: null,
  })

describe('selectionStore — select', () => {
  beforeEach(reset)
  it('replaces previous selection', () => {
    const s = useSelectionStore.getState()
    s.select({ nodes: [n1, n2], edges: [] })
    s.select({ nodes: [n3], edges: [e1] })
    const { selectedNodeIds, selectedEdgeIds } = useSelectionStore.getState()
    expect([...selectedNodeIds]).toEqual([n3])
    expect([...selectedEdgeIds]).toEqual([e1])
  })
})

describe('selectionStore — toggle', () => {
  beforeEach(reset)
  it('adds ids not present and removes ids present', () => {
    const s = useSelectionStore.getState()
    s.select({ nodes: [n1, n2], edges: [] })
    s.toggle({ nodes: [n2, n3], edges: [] })  // removes n2, adds n3
    const { selectedNodeIds } = useSelectionStore.getState()
    expect(selectedNodeIds.has(n1)).toBe(true)
    expect(selectedNodeIds.has(n2)).toBe(false)
    expect(selectedNodeIds.has(n3)).toBe(true)
  })
})

describe('selectionStore — clear', () => {
  beforeEach(reset)
  it('empties both sets', () => {
    const s = useSelectionStore.getState()
    s.select({ nodes: [n1], edges: [e1] })
    s.clear()
    const { selectedNodeIds, selectedEdgeIds } = useSelectionStore.getState()
    expect(selectedNodeIds.size).toBe(0)
    expect(selectedEdgeIds.size).toBe(0)
  })
})

describe('selectionStore — rubberband', () => {
  beforeEach(reset)
  it('start → update → commit populates selection, then clears rubberband', () => {
    const s = useSelectionStore.getState()
    s.startRubberband({ x: 10, y: 10 })
    s.updateRubberband({ x: 100, y: 100 })
    expect(useSelectionStore.getState().rubberband).toEqual({
      origin: { x: 10, y: 10 }, current: { x: 100, y: 100 },
    })
    s.commitRubberband({ nodes: [n1, n2], edges: [] })
    const state = useSelectionStore.getState()
    expect([...state.selectedNodeIds].sort()).toEqual([n1, n2].sort())
    expect(state.rubberband).toBeNull()
  })
  it('cancelRubberband zeros the rubberband without touching selection', () => {
    const s = useSelectionStore.getState()
    s.select({ nodes: [n1], edges: [] })
    s.startRubberband({ x: 0, y: 0 })
    s.cancelRubberband()
    expect(useSelectionStore.getState().rubberband).toBeNull()
    expect(useSelectionStore.getState().selectedNodeIds.has(n1)).toBe(true)
  })
})
