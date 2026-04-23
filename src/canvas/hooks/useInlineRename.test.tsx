import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useInlineRename } from './useInlineRename'
import { useDiagramStore } from '@/state/diagramStore'
import { useUiStore } from '@/state/uiStore'
import { emptyDiagram } from '@/domain/types'

const resetAll = () => {
  useDiagramStore.setState({ diagram: emptyDiagram() })
  useDiagramStore.temporal.getState().clear()
  useUiStore.setState({ inlineRename: null })
}

describe('useInlineRename', () => {
  beforeEach(resetAll)

  it('start(nodeId) for an entity seeds uiStore.inlineRename with current name', () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'Customer', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const { result } = renderHook(() => useInlineRename())
    act(() => { result.current.start(id) })
    expect(useUiStore.getState().inlineRename).toEqual({ nodeId: id, initialValue: 'Customer' })
    expect(result.current.active).toEqual({ nodeId: id, initialValue: 'Customer' })
  })

  it('start on ISA is a no-op', () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'isa', isTotal: false,
      position: { x: 0, y: 0 }, size: { width: 40, height: 40 },
    })
    const { result } = renderHook(() => useInlineRename())
    act(() => { result.current.start(id) })
    expect(useUiStore.getState().inlineRename).toBeNull()
  })

  it('commit writes the new name and clears state', () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'Old', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const { result } = renderHook(() => useInlineRename())
    act(() => { result.current.start(id) })
    act(() => { result.current.commit('New Name') })
    const node = useDiagramStore.getState().diagram.nodesById[id]
    expect(node && 'name' in node ? node.name : null).toBe('New Name')
    expect(useUiStore.getState().inlineRename).toBeNull()
  })

  it('commit with blank/whitespace leaves name unchanged but clears state', () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'Keep', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const { result } = renderHook(() => useInlineRename())
    act(() => { result.current.start(id) })
    act(() => { result.current.commit('   ') })
    const node = useDiagramStore.getState().diagram.nodesById[id]
    expect(node && 'name' in node ? node.name : null).toBe('Keep')
    expect(useUiStore.getState().inlineRename).toBeNull()
  })

  it('cancel clears state without mutating the node', () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'Stable', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const { result } = renderHook(() => useInlineRename())
    act(() => { result.current.start(id) })
    act(() => { result.current.cancel() })
    const node = useDiagramStore.getState().diagram.nodesById[id]
    expect(node && 'name' in node ? node.name : null).toBe('Stable')
    expect(useUiStore.getState().inlineRename).toBeNull()
  })
})
