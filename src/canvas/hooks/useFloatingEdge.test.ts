import { describe, it, expect } from 'vitest'
import { getNodeIntersection, edgePosition } from './useFloatingEdge'

// Minimal RF-node shape for the pure helper. Real RF nodes have more fields
// but the helper only reads these.
const mkNode = (x: number, y: number, w = 100, h = 50) => ({
  id: `n-${x}-${y}`,
  position: { x, y },
  measured: { width: w, height: h },
  width: w,
  height: h,
})

describe('getNodeIntersection', () => {
  it("node-A to its right-neighbour B: intersection point lies on A's right edge", () => {
    const a = mkNode(0, 0) // centre (50, 25), right edge x=100
    const b = mkNode(200, 0) // centre (250, 25)
    const p = getNodeIntersection(a, b)
    expect(p.x).toBeCloseTo(100, 0)
    expect(p.y).toBeCloseTo(25, 0)
  })

  it("node-A to its bottom-neighbour B: intersection on A's bottom edge", () => {
    const a = mkNode(0, 0) // centre (50, 25), bottom edge y=50
    const b = mkNode(0, 200) // centre (50, 225)
    const p = getNodeIntersection(a, b)
    expect(p.x).toBeCloseTo(50, 0)
    expect(p.y).toBeCloseTo(50, 0)
  })

  it('co-located nodes produce a finite intersection (falls back to A centre)', () => {
    const a = mkNode(0, 0)
    const b = mkNode(0, 0)
    const p = getNodeIntersection(a, b)
    expect(Number.isFinite(p.x)).toBe(true)
    expect(Number.isFinite(p.y)).toBe(true)
  })
})

describe('edgePosition', () => {
  it('returns right when intersection is on the right edge of the node', () => {
    const a = mkNode(0, 0)
    expect(edgePosition(a, { x: 100, y: 25 })).toBe('right')
  })

  it('returns left when intersection is on the left edge', () => {
    const a = mkNode(0, 0)
    expect(edgePosition(a, { x: 0, y: 25 })).toBe('left')
  })

  it('returns top / bottom for vertical edges', () => {
    const a = mkNode(0, 0)
    expect(edgePosition(a, { x: 50, y: 0 })).toBe('top')
    expect(edgePosition(a, { x: 50, y: 50 })).toBe('bottom')
  })
})
