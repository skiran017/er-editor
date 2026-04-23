import { describe, it, expect } from 'vitest'
import {
  chooseSide,
  sidePort,
  getNodeIntersection,
  assignNodePorts,
  ISA_PARENT_SIDE,
} from './useFloatingEdge'

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

describe('assignNodePorts (collision-aware distribution across 4 cardinal ports)', () => {
  it('no collision: every edge keeps its preferred side', () => {
    const hub = mkNode(0, 0, 100, 50)
    const right = mkNode(300, 0)
    const below = mkNode(0, 300)
    const map = assignNodePorts(hub, [
      { edgeId: 'e1', other: right },
      { edgeId: 'e2', other: below },
    ])
    expect(map.get('e1')).toBe('right')
    expect(map.get('e2')).toBe('bottom')
  })

  it("two edges both preferring 'right' → primary keeps right, secondary rotates to nearest unused side", () => {
    const hub = mkNode(0, 0, 100, 50) // centre (50, 25)
    // Both to the right, but one slightly above, one slightly below.
    const upperRight = mkNode(300, -120) // centre (350, -95) → angle ≈ -0.33 rad
    const lowerRight = mkNode(300, 100)  // centre (350, 125) → angle ≈ 0.34 rad (slightly below horizontal)
    const map = assignNodePorts(hub, [
      { edgeId: 'upper', other: upperRight },
      { edgeId: 'lower', other: lowerRight },
    ])
    // `lower` is slightly closer to the RIGHT central angle (0 rad) because
    // its angle magnitude is 0.34 vs upper's 0.33 — tied in practice, but
    // the algorithm's tie-breaker picks one. The key invariant is that
    // both edges get DIFFERENT sides.
    const upperSide = map.get('upper')!
    const lowerSide = map.get('lower')!
    expect(upperSide).not.toBe(lowerSide)
    // And one of them still gets RIGHT (the primary).
    expect(new Set([upperSide, lowerSide]).has('right')).toBe(true)
    // The displaced edge lands on top or bottom (nearest unused cardinal
    // from the angle).
    const displaced = upperSide === 'right' ? lowerSide : upperSide
    expect(['top', 'bottom']).toContain(displaced)
  })

  it('four edges covering all four directions → each gets a distinct side', () => {
    const hub = mkNode(0, 0, 100, 50)
    const map = assignNodePorts(hub, [
      { edgeId: 'e-right', other: mkNode(300, 0) },
      { edgeId: 'e-left', other: mkNode(-300, 0) },
      { edgeId: 'e-top', other: mkNode(0, -300) },
      { edgeId: 'e-bottom', other: mkNode(0, 300) },
    ])
    const sides = new Set(map.values())
    expect(sides.size).toBe(4)
  })

  it('recursive relationship: two edges between SAME pair of nodes land on different sides', () => {
    // Two edges with the same neighbour would both prefer 'right' and stack
    // onto the same port. Parallel-edge overrides force the 2nd edge (by
    // edgeId) onto 'top', leaving the primary on 'right'.
    const hub = mkNode(0, 0, 100, 50)
    const partner = mkNode(300, 0, 140, 70)
    const map = assignNodePorts(hub, [
      { edgeId: 'e-aaa', other: partner },
      { edgeId: 'e-bbb', other: partner },
    ])
    const first = map.get('e-aaa')!
    const second = map.get('e-bbb')!
    expect(first).not.toBe(second)
    expect(new Set([first, second]).has('right')).toBe(true)
    expect(new Set([first, second]).has('top')).toBe(true)
  })

  it('recursive relationship: BOTH ends of the 2nd parallel edge pick the SAME cardinal (top) — route is symmetric', () => {
    // The override rule is deterministic across endpoints (sort by edgeId).
    // Computing the per-node assignment from each endpoint's perspective gives
    // the 2nd parallel edge 'top' on BOTH nodes → getSmoothStepPath routes
    // the edge symmetrically over the top of both nodes.
    const entity = mkNode(0, 0, 100, 40)
    const relationship = mkNode(300, 0, 140, 70)

    const entitySides = assignNodePorts(entity, [
      { edgeId: 'e-aaa', other: relationship },
      { edgeId: 'e-bbb', other: relationship },
    ])
    const relSides = assignNodePorts(relationship, [
      { edgeId: 'e-aaa', other: entity },
      { edgeId: 'e-bbb', other: entity },
    ])

    // Both endpoints of e-bbb (the 2nd in edgeId-sorted order) must resolve
    // to 'top' — that's the symmetry guarantee the recursive fix relies on.
    expect(entitySides.get('e-bbb')).toBe('top')
    expect(relSides.get('e-bbb')).toBe('top')
  })

  it('three parallel edges to the same neighbour spread across right, top, bottom', () => {
    const hub = mkNode(0, 0, 100, 50)
    const partner = mkNode(300, 0, 140, 70)
    const map = assignNodePorts(hub, [
      { edgeId: 'e-a', other: partner },
      { edgeId: 'e-b', other: partner },
      { edgeId: 'e-c', other: partner },
    ])
    const sides = new Set(map.values())
    expect(sides.size).toBe(3)
    expect(sides.has('right')).toBe(true)
    expect(sides.has('top')).toBe(true)
    expect(sides.has('bottom')).toBe(true)
  })

  it('five edges all wanting the same side → first four spread across four cardinals, fifth stacks on the preferred', () => {
    const hub = mkNode(0, 0, 100, 50)
    // All five targets are to the right, at increasing vertical spread.
    const map = assignNodePorts(hub, [
      { edgeId: 'e1', other: mkNode(300, -50) },
      { edgeId: 'e2', other: mkNode(300, 0) },
      { edgeId: 'e3', other: mkNode(300, 50) },
      { edgeId: 'e4', other: mkNode(300, 100) },
      { edgeId: 'e5', other: mkNode(300, 150) },
    ])
    // At least four distinct sides are used (stacking only starts at edge 5).
    expect(new Set(map.values()).size).toBeGreaterThanOrEqual(4)
    // Every edge has been assigned some side.
    expect(map.size).toBe(5)
  })
})

describe('ISA port routing', () => {
  it('parent-edge side is locked to the top (centre of the inverted-triangle base)', () => {
    expect(ISA_PARENT_SIDE).toBe('top')
  })

  it('assignNodePorts with forbidden={top} redirects a child that naturally wants top onto an allowed side', () => {
    const isa = mkNode(0, 100, 100, 60)
    // Child node positioned ABOVE the ISA — without the forbidden guard it
    // would naturally prefer 'top'. With top forbidden it slides to the
    // nearest allowed cardinal (bottom/left/right).
    const childAbove = mkNode(40, 0)
    const map = assignNodePorts(
      isa,
      [{ edgeId: 'e1', other: childAbove }],
      { forbidden: new Set(['top']) },
    )
    expect(map.get('e1')).not.toBe('top')
  })

  it('three ISA children with three different natural directions each get a distinct side, none on top', () => {
    const isa = mkNode(200, 200, 100, 60)
    const below = mkNode(200, 400)  // → bottom
    const right = mkNode(500, 200)  // → right
    const left  = mkNode(0, 200)    // → left
    const map = assignNodePorts(
      isa,
      [
        { edgeId: 'below', other: below },
        { edgeId: 'right', other: right },
        { edgeId: 'left', other: left },
      ],
      { forbidden: new Set(['top']) },
    )
    const sides = new Set(map.values())
    expect(sides.size).toBe(3)
    expect(sides.has('top')).toBe(false)
  })

  it('multiple children all naturally wanting bottom fan out across bottom/right/left (no top)', () => {
    const isa = mkNode(200, 0, 100, 60)
    // All four children are below → all naturally prefer bottom. Collision
    // rotation should spread them across the three allowed cardinals.
    const map = assignNodePorts(
      isa,
      [
        { edgeId: 'c1', other: mkNode(180, 300) },
        { edgeId: 'c2', other: mkNode(220, 310) },
        { edgeId: 'c3', other: mkNode(200, 320) },
      ],
      { forbidden: new Set(['top']) },
    )
    const sides = new Set(map.values())
    expect(sides.has('top')).toBe(false)
    // At least two distinct sides used — bottom primary, another displaced.
    expect(sides.size).toBeGreaterThanOrEqual(2)
  })
})
