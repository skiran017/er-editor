import { describe, it, expect, beforeEach } from 'vitest'
import { createActor } from 'xstate'
import { editorMachine } from './machine'
import { useDiagramStore } from '@/state/diagramStore'
import { useSelectionStore } from '@/state/selectionStore'
import { useViewportStore } from '@/state/viewportStore'
import { emptyDiagram } from '@/domain/types'
import { NO_MODIFIERS } from './events'

const resetStores = () => {
  useDiagramStore.setState({ diagram: emptyDiagram() })
  useDiagramStore.temporal.getState().clear()
  useSelectionStore.setState({
    selectedNodeIds: new Set(), selectedEdgeIds: new Set(), rubberband: null,
  })
  useViewportStore.setState({ zoom: 1, pan: { x: 0, y: 0 } })
}

const startActor = () => {
  const actor = createActor(editorMachine)
  actor.start()
  return actor
}

describe('machine — selecting.resizing transitions', () => {
  beforeEach(resetStores)

  it('RESIZE_HANDLE_POINTER_DOWN → selecting.resizing + sets context', () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'A', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const actor = startActor()
    actor.send({
      type: 'RESIZE_HANDLE_POINTER_DOWN', nodeId: id, handle: 'se',
      point: { x: 120, y: 60 },
    })
    expect(actor.getSnapshot().matches({ selecting: 'resizing' })).toBe(true)
    expect(actor.getSnapshot().context.resizeNodeId).toBe(id)
    expect(actor.getSnapshot().context.resizeHandle).toBe('se')
    actor.stop()
  })

  it('CANVAS_POINTER_UP from resizing → selecting.idle + resets context', () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'A', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const actor = startActor()
    actor.send({
      type: 'RESIZE_HANDLE_POINTER_DOWN', nodeId: id, handle: 'se',
      point: { x: 120, y: 60 },
    })
    actor.send({ type: 'CANVAS_POINTER_UP', point: { x: 200, y: 100 } })
    expect(actor.getSnapshot().matches({ selecting: 'idle' })).toBe(true)
    expect(actor.getSnapshot().context.resizeNodeId).toBeNull()
    expect(actor.getSnapshot().context.resizeHandle).toBeNull()
    actor.stop()
  })
})

describe('machine — viewport shortcuts', () => {
  beforeEach(resetStores)

  it('ZOOM_IN bumps viewport zoom up', () => {
    const actor = startActor()
    useViewportStore.setState({ zoom: 1, pan: { x: 0, y: 0 } })
    actor.send({ type: 'ZOOM_IN' })
    expect(useViewportStore.getState().zoom).toBeGreaterThan(1)
    actor.stop()
  })

  it('ZOOM_OUT brings viewport zoom down', () => {
    const actor = startActor()
    useViewportStore.setState({ zoom: 2, pan: { x: 0, y: 0 } })
    actor.send({ type: 'ZOOM_OUT' })
    expect(useViewportStore.getState().zoom).toBeLessThan(2)
    actor.stop()
  })

  it('FIT is accepted (no-op in Phase 3; Phase 4 wires the bbox math)', () => {
    const actor = startActor()
    expect(() => actor.send({ type: 'FIT' })).not.toThrow()
    actor.stop()
  })
})

describe('machine — event exhaustiveness', () => {
  beforeEach(resetStores)

  // Every event declared in EditorEvent must be accepted without error — even
  // if its handler is an explicit Phase-4/6 no-op. Catches the silent-drop
  // class of bug where a keybinding dispatches an event nobody listens to.
  const DEFERRED_EVENTS = [
    { type: 'RENAME' as const },
    { type: 'CYCLE_SELECTION' as const, direction: 'forward' as const },
    { type: 'INVERT_SELECTION' as const },
    { type: 'CONFIRM' as const },
    { type: 'CANCEL' as const },
    { type: 'HANDLE_POINTER_DOWN' as const, nodeId: 'n000000001' as never, handleId: 'h1', point: { x: 0, y: 0 } },
    { type: 'EDGE_POINTER_DOWN' as const, edgeId: 'e000000001' as never, point: { x: 0, y: 0 }, modifiers: NO_MODIFIERS, button: 'left' as const },
  ]

  it.each(DEFERRED_EVENTS)('machine accepts $type without throwing', (event) => {
    const actor = startActor()
    expect(() => actor.send(event)).not.toThrow()
    actor.stop()
  })
})
