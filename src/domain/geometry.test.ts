import { describe, it, expect } from 'vitest'
import {
  pointDistance,
  pointsEqual,
  bboxContains,
  bboxIntersects,
  bboxFromNodeLike,
  centerOf,
  segmentIntersection,
  rectEdgeIntersection,
  ellipseEdgeIntersection,
  triangleEdgeIntersection,
  snapToGrid,
  clamp,
} from './geometry'
import type { BBox } from './types'

describe('pointDistance', () => {
  it('returns 0 for identical points', () => {
    expect(pointDistance({ x: 1, y: 2 }, { x: 1, y: 2 })).toBe(0)
  })
  it('uses Pythagorean distance', () => {
    expect(pointDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
  })
  it('is symmetric', () => {
    expect(pointDistance({ x: 1, y: 1 }, { x: 4, y: 5 }))
      .toBe(pointDistance({ x: 4, y: 5 }, { x: 1, y: 1 }))
  })
})

describe('pointsEqual', () => {
  it('true for identical', () => {
    expect(pointsEqual({ x: 2, y: 3 }, { x: 2, y: 3 })).toBe(true)
  })
  it('false for different x or y', () => {
    expect(pointsEqual({ x: 2, y: 3 }, { x: 2, y: 4 })).toBe(false)
    expect(pointsEqual({ x: 2, y: 3 }, { x: 1, y: 3 })).toBe(false)
  })
})

describe('bboxContains', () => {
  const box: BBox = { x: 10, y: 10, width: 20, height: 20 }

  it('true when point inside', () => {
    expect(bboxContains(box, { x: 15, y: 15 })).toBe(true)
  })
  it('true on boundary (inclusive)', () => {
    expect(bboxContains(box, { x: 10, y: 10 })).toBe(true)
    expect(bboxContains(box, { x: 30, y: 30 })).toBe(true)
  })
  it('false outside', () => {
    expect(bboxContains(box, { x: 9, y: 15 })).toBe(false)
    expect(bboxContains(box, { x: 31, y: 15 })).toBe(false)
  })
})

describe('bboxIntersects', () => {
  it('true for overlap', () => {
    expect(bboxIntersects(
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 5, y: 5, width: 10, height: 10 },
    )).toBe(true)
  })
  it('true when touching edges', () => {
    expect(bboxIntersects(
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 10, y: 0, width: 10, height: 10 },
    )).toBe(true)
  })
  it('false when separated', () => {
    expect(bboxIntersects(
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 20, y: 0, width: 10, height: 10 },
    )).toBe(false)
  })
})

describe('bboxFromNodeLike / centerOf', () => {
  it('builds bbox from position+size', () => {
    expect(bboxFromNodeLike({ position: { x: 1, y: 2 }, size: { width: 10, height: 20 } }))
      .toEqual({ x: 1, y: 2, width: 10, height: 20 })
  })
  it('computes center from position+size', () => {
    expect(centerOf({ position: { x: 0, y: 0 }, size: { width: 10, height: 20 } }))
      .toEqual({ x: 5, y: 10 })
  })
})

describe('segmentIntersection', () => {
  it('returns the crossing point', () => {
    const hit = segmentIntersection(
      { x: 0, y: 0 }, { x: 10, y: 10 },
      { x: 0, y: 10 }, { x: 10, y: 0 },
    )
    expect(hit).toEqual({ x: 5, y: 5 })
  })
  it('returns null for parallel lines', () => {
    expect(segmentIntersection(
      { x: 0, y: 0 }, { x: 10, y: 0 },
      { x: 0, y: 5 }, { x: 10, y: 5 },
    )).toBeNull()
  })
  it('returns null for non-overlapping segments on the same line', () => {
    expect(segmentIntersection(
      { x: 0, y: 0 }, { x: 5, y: 0 },
      { x: 10, y: 0 }, { x: 20, y: 0 },
    )).toBeNull()
  })
})

describe('rectEdgeIntersection', () => {
  const rect: BBox = { x: 0, y: 0, width: 100, height: 50 }

  it('returns the right-edge point for a rightward target', () => {
    const p = rectEdgeIntersection(rect, { x: 200, y: 25 })
    expect(p).toEqual({ x: 100, y: 25 })
  })
  it('returns the top-edge point for an upward target', () => {
    const p = rectEdgeIntersection(rect, { x: 50, y: -50 })
    expect(p).toEqual({ x: 50, y: 0 })
  })
  it('returns the center for an internal target (degenerate)', () => {
    const p = rectEdgeIntersection(rect, { x: 50, y: 25 })
    expect(p).toEqual({ x: 50, y: 25 })
  })
})

describe('ellipseEdgeIntersection', () => {
  const box: BBox = { x: 0, y: 0, width: 100, height: 50 } // center (50,25), a=50, b=25

  it('hits on the right side for a horizontal target', () => {
    const p = ellipseEdgeIntersection(box, { x: 200, y: 25 })
    expect(p?.x).toBeCloseTo(100, 4)
    expect(p?.y).toBeCloseTo(25, 4)
  })
  it('hits on the top for a vertical target', () => {
    const p = ellipseEdgeIntersection(box, { x: 50, y: -50 })
    expect(p?.x).toBeCloseTo(50, 4)
    expect(p?.y).toBeCloseTo(0, 4)
  })
})

describe('triangleEdgeIntersection', () => {
  // Equilateral-ish triangle inscribed in bbox (0,0)-(100,50). Apex top, base bottom.
  const box: BBox = { x: 0, y: 0, width: 100, height: 50 }

  it('returns the apex for an upward target', () => {
    const p = triangleEdgeIntersection(box, { x: 50, y: -100 })
    expect(p).toEqual({ x: 50, y: 0 })
  })
  it('returns on the base for a downward target', () => {
    const p = triangleEdgeIntersection(box, { x: 50, y: 200 })
    expect(p?.y).toBeCloseTo(50, 4)
  })
})

describe('snapToGrid', () => {
  it('rounds to nearest step', () => {
    expect(snapToGrid(13, 10)).toBe(10)
    expect(snapToGrid(16, 10)).toBe(20)
  })
  it('returns input when step is 0', () => {
    expect(snapToGrid(13, 0)).toBe(13)
  })
  it('handles negative values', () => {
    expect(snapToGrid(-13, 10)).toBe(-10)
  })
})

describe('clamp', () => {
  it('returns value inside range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
  })
  it('clamps to min', () => {
    expect(clamp(-5, 0, 10)).toBe(0)
  })
  it('clamps to max', () => {
    expect(clamp(15, 0, 10)).toBe(10)
  })
})
