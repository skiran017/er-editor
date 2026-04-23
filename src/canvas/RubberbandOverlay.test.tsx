import { describe, it, expect, beforeEach } from 'vitest'
import { act, render } from '@testing-library/react'
import { RubberbandOverlay } from './RubberbandOverlay'
import { useSelectionStore } from '@/state/selectionStore'
import { useViewportStore } from '@/state/viewportStore'

const reset = () => {
  useSelectionStore.setState({
    selectedNodeIds: new Set(), selectedEdgeIds: new Set(), rubberband: null,
  })
  useViewportStore.setState({ zoom: 1, pan: { x: 0, y: 0 } })
}

describe('RubberbandOverlay', () => {
  beforeEach(reset)

  it('renders nothing while the rubberband is null', () => {
    const { container } = render(<RubberbandOverlay />)
    expect(container.querySelector('[data-role="rubberband-overlay"]')).toBeNull()
  })

  it('renders nothing for a degenerate rubberband (origin == current, no drag)', () => {
    act(() => {
      useSelectionStore.getState().startRubberband({ x: 100, y: 100 })
    })
    const { container } = render(<RubberbandOverlay />)
    expect(container.querySelector('[data-role="rubberband-overlay"]')).toBeNull()
  })

  it('renders a blue dashed rect spanning from origin to current (world coords, zoom=1, pan=0)', () => {
    act(() => {
      useSelectionStore.getState().startRubberband({ x: 50, y: 60 })
      useSelectionStore.getState().updateRubberband({ x: 200, y: 180 })
    })
    const { container } = render(<RubberbandOverlay />)
    const rect = container.querySelector('[data-role="rubberband-overlay"] rect')!
    expect(rect.getAttribute('x')).toBe('50')
    expect(rect.getAttribute('y')).toBe('60')
    expect(rect.getAttribute('width')).toBe('150')
    expect(rect.getAttribute('height')).toBe('120')
    expect(rect.getAttribute('stroke-dasharray')).toBe('4 3')
  })

  it('normalises a REVERSE drag (current < origin) so width/height are positive', () => {
    act(() => {
      useSelectionStore.getState().startRubberband({ x: 300, y: 300 })
      useSelectionStore.getState().updateRubberband({ x: 100, y: 150 })
    })
    const { container } = render(<RubberbandOverlay />)
    const rect = container.querySelector('[data-role="rubberband-overlay"] rect')!
    expect(rect.getAttribute('x')).toBe('100')
    expect(rect.getAttribute('y')).toBe('150')
    expect(rect.getAttribute('width')).toBe('200')
    expect(rect.getAttribute('height')).toBe('150')
  })

  it('applies viewport zoom + pan when converting world coords to screen pixels', () => {
    useViewportStore.setState({ zoom: 2, pan: { x: 10, y: 20 } })
    act(() => {
      useSelectionStore.getState().startRubberband({ x: 0, y: 0 })
      useSelectionStore.getState().updateRubberband({ x: 50, y: 50 })
    })
    const { container } = render(<RubberbandOverlay />)
    const rect = container.querySelector('[data-role="rubberband-overlay"] rect')!
    // world (0,0) → (0*2 + 10, 0*2 + 20) = (10, 20). world size 50 → 100 px.
    expect(rect.getAttribute('x')).toBe('10')
    expect(rect.getAttribute('y')).toBe('20')
    expect(rect.getAttribute('width')).toBe('100')
    expect(rect.getAttribute('height')).toBe('100')
  })
})
