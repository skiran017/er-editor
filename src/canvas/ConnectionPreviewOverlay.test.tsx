import { describe, it, expect, beforeEach } from 'vitest'
import { act, render } from '@testing-library/react'
import { ConnectionPreviewOverlay } from './ConnectionPreviewOverlay'
import { useDiagramStore } from '@/state/diagramStore'
import { useViewportStore } from '@/state/viewportStore'
import { useSelectionStore } from '@/state/selectionStore'
import { useInteractionStore } from '@/interaction/interactionStore'
import { emptyDiagram } from '@/domain/types'
import { NO_MODIFIERS } from '@/interaction/events'

const resetAll = () => {
  useDiagramStore.setState({ diagram: emptyDiagram() })
  useDiagramStore.temporal.getState().clear()
  useViewportStore.setState({ zoom: 1, pan: { x: 0, y: 0 } })
  useSelectionStore.setState({ selectedNodeIds: new Set(), selectedEdgeIds: new Set(), rubberband: null })
  useInteractionStore.getState().send({ type: 'PICK_TOOL', tool: 'select' })
}

beforeEach(resetAll)

const addEntity = (pos = { x: 0, y: 0 }, size = { width: 100, height: 40 }) =>
  useDiagramStore.getState().addNode({
    kind: 'entity', name: 'E', isWeak: false, position: pos, size,
  })

const movePointer = (x: number, y: number) => {
  // jsdom lacks a `PointerEvent` constructor. MouseEvent dispatched under the
  // 'pointermove' type name still fires pointermove listeners (the overlay
  // only reads clientX/clientY from the event).
  act(() => {
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: x, clientY: y }))
  })
}

describe('ConnectionPreviewOverlay — not connecting', () => {
  it('renders nothing when the FSM is in selecting.idle (no connect state active)', () => {
    const { container } = render(<ConnectionPreviewOverlay />)
    expect(container.querySelector('[data-role="connection-preview"]')).toBeNull()
  })

  it('renders nothing when in drawing.connection.fromPicked but no pointermove has fired yet', () => {
    const id = addEntity({ x: 0, y: 0 }, { width: 120, height: 60 })
    act(() => {
      useInteractionStore.getState().send({ type: 'PICK_TOOL', tool: 'connect' })
      useInteractionStore.getState().send({
        type: 'NODE_POINTER_DOWN', nodeId: id, point: { x: 0, y: 0 },
        modifiers: NO_MODIFIERS, button: 'left',
      })
    })
    const { container } = render(<ConnectionPreviewOverlay />)
    expect(container.querySelector('[data-role="connection-preview"]')).toBeNull()
  })
})

describe('ConnectionPreviewOverlay — renders while connecting', () => {
  it('renders a dashed line + source circle in drawing.connection.fromPicked after a pointermove', () => {
    const id = addEntity({ x: 10, y: 20 }, { width: 100, height: 40 })
    const { container } = render(<ConnectionPreviewOverlay />)
    act(() => {
      useInteractionStore.getState().send({ type: 'PICK_TOOL', tool: 'connect' })
      useInteractionStore.getState().send({
        type: 'NODE_POINTER_DOWN', nodeId: id, point: { x: 60, y: 40 },
        modifiers: NO_MODIFIERS, button: 'left',
      })
    })
    movePointer(200, 200)
    const svg = container.querySelector('[data-role="connection-preview"]')
    expect(svg).not.toBeNull()
    const line = svg!.querySelector('line')
    expect(line).not.toBeNull()
    // source centre = (10 + 100/2, 20 + 40/2) = (60, 40); zoom=1, pan=(0,0)
    expect(line!.getAttribute('x1')).toBe('60')
    expect(line!.getAttribute('y1')).toBe('40')
    expect(line!.getAttribute('x2')).toBe('200')
    expect(line!.getAttribute('y2')).toBe('200')
    expect(svg!.querySelector('circle')).not.toBeNull()
  })

  it('renders in quickRelationship.firstPicked (source id lives in quickFirstId)', () => {
    const id = addEntity()
    const { container } = render(<ConnectionPreviewOverlay />)
    act(() => {
      useInteractionStore.getState().send({ type: 'PICK_TOOL', tool: 'quickRelationship' })
      useInteractionStore.getState().send({
        type: 'NODE_POINTER_DOWN', nodeId: id, point: { x: 50, y: 20 },
        modifiers: NO_MODIFIERS, button: 'left',
      })
    })
    movePointer(300, 150)
    expect(container.querySelector('[data-role="connection-preview"] line')).not.toBeNull()
  })

  it('renders in quickGeneralization.firstPicked', () => {
    const id = addEntity()
    const { container } = render(<ConnectionPreviewOverlay />)
    act(() => {
      useInteractionStore.getState().send({ type: 'PICK_TOOL', tool: 'quickGeneralization' })
      useInteractionStore.getState().send({
        type: 'NODE_POINTER_DOWN', nodeId: id, point: { x: 50, y: 20 },
        modifiers: NO_MODIFIERS, button: 'left',
      })
    })
    movePointer(300, 150)
    expect(container.querySelector('[data-role="connection-preview"] line')).not.toBeNull()
  })

  it('renders in connectToGeneralization.waitingForChild', () => {
    const isaId = useDiagramStore.getState().addNode({
      kind: 'isa', isTotal: false,
      position: { x: 0, y: 0 }, size: { width: 100, height: 60 },
    })
    const { container } = render(<ConnectionPreviewOverlay />)
    act(() => {
      useInteractionStore.getState().send({ type: 'CONNECT_CHILD_TO_ISA', isaId })
    })
    movePointer(250, 120)
    expect(container.querySelector('[data-role="connection-preview"] line')).not.toBeNull()
  })

  it('applies viewport zoom + pan when computing the source centre', () => {
    const id = addEntity({ x: 10, y: 20 }, { width: 100, height: 40 })
    useViewportStore.setState({ zoom: 2, pan: { x: 5, y: 7 } })
    const { container } = render(<ConnectionPreviewOverlay />)
    act(() => {
      useInteractionStore.getState().send({ type: 'PICK_TOOL', tool: 'connect' })
      useInteractionStore.getState().send({
        type: 'NODE_POINTER_DOWN', nodeId: id, point: { x: 60, y: 40 },
        modifiers: NO_MODIFIERS, button: 'left',
      })
    })
    movePointer(400, 400)
    const line = container.querySelector('[data-role="connection-preview"] line')
    // source centre = (10 + 50, 20 + 20) = (60, 40) in diagram coords.
    // In screen coords: 60*2 + 5 = 125, 40*2 + 7 = 87.
    expect(line!.getAttribute('x1')).toBe('125')
    expect(line!.getAttribute('y1')).toBe('87')
  })
})
