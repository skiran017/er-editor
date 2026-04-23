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
  it('keeps the world anchor point fixed on screen through the zoom change', () => {
    // Contract (post world-coord refactor): `anchor` is in world space, same
    // coordinate system every `Point` in the FSM uses. The invariant is that
    // the SCREEN pixel rendering that world point before the zoom keeps
    // rendering it after: `screen = world * zoom + pan` is preserved.
    // Starting from identity (zoom=1, pan=0), world (100,50) maps to screen
    // (100,50). Zooming to 2x must leave that mapping unchanged:
    //   nextPan = pan + anchor * (zoom - nextZoom) = 0 + 100*(1-2) = -100
    useViewportStore.getState().zoomAt({ x: 100, y: 50 }, 2 - 1)
    const { zoom, pan } = useViewportStore.getState()
    expect(zoom).toBe(2)
    expect(pan).toEqual({ x: -100, y: -50 })
  })

  it('works from a non-identity viewport (non-zero pan)', () => {
    // Start at zoom=2, pan=(30, -10). World (100, 50) renders at
    // screen = 100*2 + 30 = 230, 50*2 + (-10) = 90.
    // Zoom up to 3x anchored at world (100, 50): screen must stay (230, 90).
    //   nextPan = (30, -10) + (100, 50) * (2 - 3) = (30 - 100, -10 - 50) = (-70, -60)
    //   check: 100*3 + (-70) = 230 ✓ ; 50*3 + (-60) = 90 ✓
    useViewportStore.setState({ zoom: 2, pan: { x: 30, y: -10 } })
    useViewportStore.getState().zoomAt({ x: 100, y: 50 }, 1)
    const { zoom, pan } = useViewportStore.getState()
    expect(zoom).toBe(3)
    expect(pan).toEqual({ x: -70, y: -60 })
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
