import { describe, it, expect } from 'vitest'
import { chooseSide, sidePort, getNodeIntersection } from './useFloatingEdge'

// Minimal RF-node shape for the pure helpers. Real RF nodes have more
// fields but the helpers only read these.
const mkNode = (x: number, y: number, w = 100, h = 50) => ({
  id: `n-${x}-${y}`,
  position: { x, y },
  measured: { width: w, height: h },
  width: w,
  height: h,
})

describe('chooseSide', () => {
  it("returns 'right' when b is to the right of a", () => {
    const a = mkNode(0, 0)
    const b = mkNode(200, 0)
    expect(chooseSide(a, b)).toBe('right')
  })

  it("returns 'left' when b is to the left of a", () => {
    const a = mkNode(200, 0)
    const b = mkNode(0, 0)
    expect(chooseSide(a, b)).toBe('left')
  })

  it("returns 'bottom' when b is below a", () => {
    const a = mkNode(0, 0)
    const b = mkNode(0, 200)
    expect(chooseSide(a, b)).toBe('bottom')
  })

  it("returns 'top' when b is above a", () => {
    const a = mkNode(0, 200)
    const b = mkNode(0, 0)
    expect(chooseSide(a, b)).toBe('top')
  })

  it('picks the axis with larger scaled offset when both non-zero (bbox-aspect-ratio aware)', () => {
    // a is 100 wide × 50 tall. b is 60 to the right and 40 below — in
    // half-size-scaled space, dx/halfW = 60/50 = 1.2 vs dy/halfH = 40/25 =
    // 1.6, so the vertical axis dominates and 'bottom' wins.
    const a = mkNode(0, 0, 100, 50)
    const b = mkNode(60, 40, 100, 50)
    expect(chooseSide(a, b)).toBe('bottom')
  })
})

describe('sidePort', () => {
  const a = mkNode(10, 20, 100, 50)
  it('top midpoint', () => {
    expect(sidePort(a, 'top')).toEqual({ x: 60, y: 20 })
  })
  it('right midpoint', () => {
    expect(sidePort(a, 'right')).toEqual({ x: 110, y: 45 })
  })
  it('bottom midpoint', () => {
    expect(sidePort(a, 'bottom')).toEqual({ x: 60, y: 70 })
  })
  it('left midpoint', () => {
    expect(sidePort(a, 'left')).toEqual({ x: 10, y: 45 })
  })
})

describe('getNodeIntersection (back-compat: now returns a cardinal midpoint)', () => {
  it("node-A → right-neighbour B: port sits on A's right midpoint", () => {
    const a = mkNode(0, 0, 100, 50) // right midpoint is (100, 25)
    const b = mkNode(200, 0)
    const p = getNodeIntersection(a, b)
    expect(p).toEqual({ x: 100, y: 25 })
  })

  it("node-A → bottom-neighbour B: port sits on A's bottom midpoint", () => {
    const a = mkNode(0, 0, 100, 50) // bottom midpoint is (50, 50)
    const b = mkNode(0, 200)
    const p = getNodeIntersection(a, b)
    expect(p).toEqual({ x: 50, y: 50 })
  })

  it('co-located nodes still produce a finite port (defaults to right)', () => {
    const a = mkNode(0, 0)
    const b = mkNode(0, 0)
    const p = getNodeIntersection(a, b)
    expect(Number.isFinite(p.x)).toBe(true)
    expect(Number.isFinite(p.y)).toBe(true)
  })

  it('diagonal target → port is on the BOUNDARY of the rectangle (never inside), at a cardinal midpoint', () => {
    // The old bbox-intersection formula could return a point inside the
    // rectangle on diagonals (it computed intersection with an inscribed
    // diamond). Cardinal-midpoint snapping sidesteps the issue entirely.
    const a = mkNode(0, 0, 100, 50)
    const b = mkNode(100, 50)
    const p = getNodeIntersection(a, b)
    // Must be one of the four midpoints of A's bbox.
    const midpoints = [
      { x: 50, y: 0 },   // top
      { x: 100, y: 25 }, // right
      { x: 50, y: 50 },  // bottom
      { x: 0, y: 25 },   // left
    ]
    const hit = midpoints.some((m) => m.x === p.x && m.y === p.y)
    expect(hit).toBe(true)
  })
})
