import { describe, it, expect } from 'vitest'
import { rfToDiagramPatch } from './rfToDiagramPatch'
import type { NodeChange, EdgeChange } from '@xyflow/react'
import type { NodeId, EdgeId } from '@/domain/types'

const nid = (x: string) => x as NodeId
const eid = (x: string) => x as EdgeId

describe('rfToDiagramPatch', () => {
  it('empty changes → empty patch', () => {
    expect(rfToDiagramPatch([], [])).toEqual({})
  })

  it('position change → updateNodes with position', () => {
    const changes: NodeChange[] = [
      { type: 'position', id: 'n1', position: { x: 100, y: 200 }, dragging: false },
    ]
    const patch = rfToDiagramPatch(changes, [])
    expect(patch.updateNodes).toEqual([{ id: nid('n1'), patch: { position: { x: 100, y: 200 } } }])
  })

  it('position change mid-drag (no position yet) is skipped', () => {
    const changes: NodeChange[] = [
      { type: 'position', id: 'n1', dragging: true } as NodeChange,
    ]
    const patch = rfToDiagramPatch(changes, [])
    expect(patch.updateNodes).toBeUndefined()
  })

  it('dimensions change → updateNodes with size', () => {
    const changes: NodeChange[] = [
      { type: 'dimensions', id: 'n1', dimensions: { width: 140, height: 80 }, resizing: false },
    ]
    const patch = rfToDiagramPatch(changes, [])
    expect(patch.updateNodes).toEqual([{ id: nid('n1'), patch: { size: { width: 140, height: 80 } } }])
  })

  it('dimensions change without dimensions field (mid-resize frame) is skipped', () => {
    const changes: NodeChange[] = [
      { type: 'dimensions', id: 'n1', resizing: true } as NodeChange,
    ]
    const patch = rfToDiagramPatch(changes, [])
    expect(patch.updateNodes).toBeUndefined()
  })

  it('remove node change → removeNodes', () => {
    const changes: NodeChange[] = [{ type: 'remove', id: 'n1' }]
    const patch = rfToDiagramPatch(changes, [])
    expect(patch.removeNodes).toEqual([nid('n1')])
  })

  it('remove edge change → removeEdges', () => {
    const changes: EdgeChange[] = [{ type: 'remove', id: 'e1' }]
    const patch = rfToDiagramPatch([], changes)
    expect(patch.removeEdges).toEqual([eid('e1')])
  })

  it('select changes are ignored (selection lives in selectionStore)', () => {
    const changes: NodeChange[] = [{ type: 'select', id: 'n1', selected: true }]
    expect(rfToDiagramPatch(changes, [])).toEqual({})
  })

  it('add changes are ignored (creation goes through the FSM)', () => {
    const changes: NodeChange[] = [
      { type: 'add', item: { id: 'n1', type: 'entity', position: { x: 0, y: 0 }, data: { nodeId: nid('n1') } } } as NodeChange,
    ]
    expect(rfToDiagramPatch(changes, [])).toEqual({})
  })

  it('collapses multiple position changes for the same node into the last one', () => {
    const changes: NodeChange[] = [
      { type: 'position', id: 'n1', position: { x: 10, y: 10 }, dragging: false },
      { type: 'position', id: 'n1', position: { x: 20, y: 20 }, dragging: false },
    ]
    const patch = rfToDiagramPatch(changes, [])
    expect(patch.updateNodes).toEqual([{ id: nid('n1'), patch: { position: { x: 20, y: 20 } } }])
  })

  it('combines position + dimensions for the same node into one update with merged patch', () => {
    const changes: NodeChange[] = [
      { type: 'position', id: 'n1', position: { x: 10, y: 10 }, dragging: false },
      { type: 'dimensions', id: 'n1', dimensions: { width: 100, height: 50 }, resizing: false },
    ]
    const patch = rfToDiagramPatch(changes, [])
    expect(patch.updateNodes).toEqual([
      { id: nid('n1'), patch: { position: { x: 10, y: 10 }, size: { width: 100, height: 50 } } },
    ])
  })
})
