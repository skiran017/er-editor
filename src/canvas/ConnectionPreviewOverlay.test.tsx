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
  it('renders a dashed line starting on the source node boundary-diamond (not at the centre) pointed toward the cursor', () => {
    // Source bbox = (10, 20, 100, 40) → centre (60, 40). Cursor at (200, 200)
    // in world coords (zoom=1, pan=0). The preview line starts on the
    // boundary-diamond computed by getNodeIntersection — this is the same
    // approximation React Flow uses for its floating edges, so rendered
    // preview lines and rendered final edges line up visually.
    //
    // The key guarantees this test locks in:
    //   - start point is NOT the node centre (the drag-follow fix was
    //     supposed to move the origin OUT of the centre)
    //   - start point is pointed TOWARD the cursor (between centre and
    //     cursor, bounded by the bbox)
    //   - source dot circle is gone
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
    const x1 = parseFloat(line!.getAttribute('x1')!)
    const y1 = parseFloat(line!.getAttribute('y1')!)
    expect(Number.isFinite(x1)).toBe(true)
    expect(Number.isFinite(y1)).toBe(true)
    // Edges now snap to a cardinal midpoint of the source bbox — so the
    // origin is one of (top, right, bottom, left) midpoints, never the
    // centre. Cursor at (200, 200) from centre (60, 40) → vertical offset
    // dominates (scaled by half-sizes), so bottom midpoint (60, 60) is
    // chosen. X stays at the bbox centre horizontally.
    expect(x1).toBe(60)
    expect(y1).toBe(60)
    // Origin is on the bbox boundary: x ∈ [10, 110], y ∈ [20, 60].
    expect(x1).toBeGreaterThanOrEqual(10)
    expect(x1).toBeLessThanOrEqual(110)
    expect(y1).toBeGreaterThanOrEqual(20)
    expect(y1).toBeLessThanOrEqual(60)
    // End point is the cursor.
    expect(line!.getAttribute('x2')).toBe('200')
    expect(line!.getAttribute('y2')).toBe('200')
    // Source dot is gone (the boundary origin makes it redundant).
    expect(svg!.querySelector('circle')).toBeNull()
  })

  it('renders in quickRelationship.firstPicked (source id lives in quickFirstId)', () => {
    const id = addEntity()
    const { container } = render(<ConnectionPreviewOverlay />)
    act(() => {
      useInteractionStore.getState().send({ type: 'PICK_TOOL', tool: 'quickRelationship1N' })
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

  it('snaps BOTH endpoints to cardinal midpoints when the cursor is over a valid target node', () => {
    // Source bbox (0, 0, 100, 40) → centre (50, 20).
    // Target bbox (300, 0, 100, 40) → centre (350, 20).
    // Target is directly to the right, so the expected ports are:
    //   source right-midpoint → (100, 20)
    //   target left-midpoint  → (300, 20)
    // The cursor lives INSIDE the target's bbox (say (320, 15)) to trigger snap;
    // the line ends at the cardinal midpoint, NOT the cursor position.
    const sourceId = addEntity({ x: 0, y: 0 }, { width: 100, height: 40 })
    addEntity({ x: 300, y: 0 }, { width: 100, height: 40 })
    const { container } = render(<ConnectionPreviewOverlay />)
    act(() => {
      useInteractionStore.getState().send({ type: 'PICK_TOOL', tool: 'connect' })
      useInteractionStore.getState().send({
        type: 'NODE_POINTER_DOWN', nodeId: sourceId, point: { x: 50, y: 20 },
        modifiers: NO_MODIFIERS, button: 'left',
      })
    })
    movePointer(320, 15)
    const line = container.querySelector('[data-role="connection-preview"] line')!
    expect(line.getAttribute('data-snapped')).toBe('true')
    expect(parseFloat(line.getAttribute('x1')!)).toBe(100)
    expect(parseFloat(line.getAttribute('y1')!)).toBe(20)
    expect(parseFloat(line.getAttribute('x2')!)).toBe(300)
    expect(parseFloat(line.getAttribute('y2')!)).toBe(20)
  })

  it('does not snap to the source node itself (cursor over source → follows cursor freely)', () => {
    const sourceId = addEntity({ x: 0, y: 0 }, { width: 100, height: 40 })
    const { container } = render(<ConnectionPreviewOverlay />)
    act(() => {
      useInteractionStore.getState().send({ type: 'PICK_TOOL', tool: 'connect' })
      useInteractionStore.getState().send({
        type: 'NODE_POINTER_DOWN', nodeId: sourceId, point: { x: 50, y: 20 },
        modifiers: NO_MODIFIERS, button: 'left',
      })
    })
    // Cursor inside the SOURCE bbox — must NOT snap (source ≠ target).
    movePointer(30, 15)
    const line = container.querySelector('[data-role="connection-preview"] line')!
    expect(line.getAttribute('data-snapped')).toBe('false')
  })

  it('applies viewport zoom + pan when mapping the boundary origin to screen coords', () => {
    // Source world bbox: (10, 20, 100, 40) → world centre (60, 40).
    // With zoom=2, pan=(5, 7) the centre in screen coords is (125, 87) and
    // the bbox edges in screen coords span x∈[25,225], y∈[47,127].
    // Cursor at screen (400, 400) → world (197.5, 196.5), bottom-right of
    // the node.
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
    const x1 = parseFloat(line!.getAttribute('x1')!)
    const y1 = parseFloat(line!.getAttribute('y1')!)
    expect(Number.isFinite(x1)).toBe(true)
    expect(Number.isFinite(y1)).toBe(true)
    // Cardinal-midpoint snap: world bottom-midpoint (60, 60) → screen
    // (125, 127). Origin is on one of the four cardinal midpoints of the
    // screen-space bbox.
    expect(x1).toBeGreaterThanOrEqual(25)
    expect(x1).toBeLessThanOrEqual(225)
    expect(y1).toBeGreaterThanOrEqual(47)
    expect(y1).toBeLessThanOrEqual(127)
  })
})
