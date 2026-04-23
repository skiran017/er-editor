import { describe, it, expect, beforeEach } from 'vitest'
import { createActor } from 'xstate'
import { editorMachine } from './machine'
import { useDiagramStore } from '@/state/diagramStore'
import { useSelectionStore } from '@/state/selectionStore'
import { emptyDiagram } from '@/domain/types'
import { NO_MODIFIERS } from './events'

const reset = () => {
  useDiagramStore.setState({ diagram: emptyDiagram() })
  useDiagramStore.temporal.getState().clear()
  useSelectionStore.setState({
    selectedNodeIds: new Set(), selectedEdgeIds: new Set(), rubberband: null,
  })
}

describe('interaction — integration flows', () => {
  beforeEach(reset)

  it('place 2 entities → quick-relationship → relationship node + 2 edges', () => {
    const actor = createActor(editorMachine)
    actor.start()

    actor.send({ type: 'PICK_TOOL', tool: 'entity' })
    actor.send({ type: 'CANVAS_POINTER_UP', point: { x: 0, y: 0 } })
    actor.send({ type: 'CANVAS_POINTER_UP', point: { x: 200, y: 0 } })

    expect(useDiagramStore.getState().diagram.nodeOrder).toHaveLength(2)

    actor.send({ type: 'PICK_TOOL', tool: 'quickRelationship1N' })

    const [a, b] = useDiagramStore.getState().diagram.nodeOrder
    actor.send({
      type: 'NODE_POINTER_DOWN', nodeId: a!, point: { x: 0, y: 0 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    actor.send({
      type: 'NODE_POINTER_DOWN', nodeId: b!, point: { x: 200, y: 0 },
      modifiers: NO_MODIFIERS, button: 'left',
    })

    const d = useDiagramStore.getState().diagram
    expect(d.nodeOrder).toHaveLength(3)
    expect(d.edgeOrder).toHaveLength(2)
    actor.stop()
  })

  it('place entity, undo — ends with empty diagram', () => {
    const actor = createActor(editorMachine)
    actor.start()

    actor.send({ type: 'PICK_TOOL', tool: 'entity' })
    actor.send({ type: 'CANVAS_POINTER_UP', point: { x: 50, y: 50 } })
    expect(useDiagramStore.getState().diagram.nodeOrder).toHaveLength(1)

    actor.send({ type: 'UNDO' })
    expect(useDiagramStore.getState().diagram.nodeOrder).toHaveLength(0)

    actor.stop()
  })

  it('select tool → rubberband drag selects a node', () => {
    useDiagramStore.getState().addNode({
      kind: 'entity', name: 'X', isWeak: false,
      position: { x: 50, y: 50 }, size: { width: 20, height: 20 },
    })
    const id = useDiagramStore.getState().diagram.nodeOrder[0]!

    const actor = createActor(editorMachine)
    actor.start()

    actor.send({
      type: 'CANVAS_POINTER_DOWN', point: { x: 0, y: 0 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    actor.send({ type: 'CANVAS_POINTER_MOVE', point: { x: 100, y: 100 } })
    actor.send({ type: 'CANVAS_POINTER_UP', point: { x: 100, y: 100 } })

    expect(useSelectionStore.getState().selectedNodeIds.has(id)).toBe(true)
    actor.stop()
  })
})
