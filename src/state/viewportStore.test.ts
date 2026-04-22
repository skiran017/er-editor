import { describe, it, expect, beforeEach } from 'vitest'
import { useViewportStore } from './viewportStore'

const reset = () => useViewportStore.setState({ zoom: 1, pan: { x: 0, y: 0 } })

describe('viewportStore — initial state', () => {
  beforeEach(reset)
  it('starts at zoom=1, pan=(0,0)', () => {
    const s = useViewportStore.getState()
    expect(s.zoom).toBe(1)
    expect(s.pan).toEqual({ x: 0, y: 0 })
  })
})

describe('viewportStore — setViewport', () => {
  beforeEach(reset)
  it('updates zoom and pan together', () => {
    useViewportStore.getState().setViewport({ zoom: 2, pan: { x: 10, y: 20 } })
    expect(useViewportStore.getState()).toMatchObject({ zoom: 2, pan: { x: 10, y: 20 } })
  })
  it('clamps zoom to [0.1, 4]', () => {
    useViewportStore.getState().setViewport({ zoom: 100, pan: { x: 0, y: 0 } })
    expect(useViewportStore.getState().zoom).toBe(4)
    useViewportStore.getState().setViewport({ zoom: 0.01, pan: { x: 0, y: 0 } })
    expect(useViewportStore.getState().zoom).toBe(0.1)
  })
})

describe('viewportStore — zoomAt', () => {
  beforeEach(reset)
  it('keeps the anchor point fixed in screen space', () => {
    // Before: zoom=1, pan=(0,0). The screen point (100,50) corresponds to
    // world (100,50). After zooming to 2x anchored at that screen point,
    // (100,50) in screen space must still map to (100,50) in world space:
    //   world = (screen - pan) / zoom  →  pan = screen - world * zoom
    useViewportStore.getState().zoomAt({ x: 100, y: 50 }, 2 - 1) // delta = 1 → target zoom 2
    const { zoom, pan } = useViewportStore.getState()
    expect(zoom).toBe(2)
    expect(pan).toEqual({ x: -100, y: -50 })
  })
})

describe('viewportStore — fit', () => {
  beforeEach(reset)
  it('centers a bbox with padding', () => {
    useViewportStore.getState().fit(
      { x: 100, y: 100, width: 200, height: 100 },
      { width: 800, height: 600 },
      20,
    )
    const { zoom, pan } = useViewportStore.getState()
    // Fit: max zoom that fits bbox+padding in viewport.
    // scaleX = (800 - 40) / 200 = 3.8 ; scaleY = (600 - 40) / 100 = 5.6 → zoom = 3.8, clamped to 4 max
    // But we clamp to 4 above; so zoom = 3.8
    expect(zoom).toBeCloseTo(3.8, 3)
    // Center bbox (200,150) at viewport center (400,300)
    // pan = screenCenter - worldCenter * zoom = (400 - 200*3.8, 300 - 150*3.8) = (-360, -270)
    expect(pan.x).toBeCloseTo(-360, 3)
    expect(pan.y).toBeCloseTo(-270, 3)
  })
})
