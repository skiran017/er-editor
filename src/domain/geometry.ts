import type { BBox, Point } from './types'

type Positioned = { readonly position: Point; readonly size: { readonly width: number; readonly height: number } }

export const pointDistance = (a: Point, b: Point): number => {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

export const pointsEqual = (a: Point, b: Point): boolean =>
  a.x === b.x && a.y === b.y

export const bboxContains = (box: BBox, p: Point): boolean =>
  p.x >= box.x && p.x <= box.x + box.width &&
  p.y >= box.y && p.y <= box.y + box.height

export const bboxIntersects = (a: BBox, b: BBox): boolean =>
  !(a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y)

export const bboxFromNodeLike = (n: Positioned): BBox => ({
  x: n.position.x,
  y: n.position.y,
  width: n.size.width,
  height: n.size.height,
})

export const centerOf = (n: Positioned): Point => ({
  x: n.position.x + n.size.width / 2,
  y: n.position.y + n.size.height / 2,
})

// Segment-segment intersection. Returns the crossing point or null.
export const segmentIntersection = (
  p1: Point, p2: Point,
  p3: Point, p4: Point,
): Point | null => {
  const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x)
  if (d === 0) return null
  const t = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d
  const u = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d
  if (t < 0 || t > 1 || u < 0 || u > 1) return null
  return { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) }
}

// Line from rect center toward `target`; returns the point where it exits the rect.
// If target is inside, returns target (degenerate case — caller decides what to do).
export const rectEdgeIntersection = (rect: BBox, target: Point): Point => {
  const cx = rect.x + rect.width / 2
  const cy = rect.y + rect.height / 2
  if (bboxContains(rect, target)) return target

  const corners: readonly [Point, Point][] = [
    [{ x: rect.x, y: rect.y }, { x: rect.x + rect.width, y: rect.y }],
    [{ x: rect.x + rect.width, y: rect.y }, { x: rect.x + rect.width, y: rect.y + rect.height }],
    [{ x: rect.x + rect.width, y: rect.y + rect.height }, { x: rect.x, y: rect.y + rect.height }],
    [{ x: rect.x, y: rect.y + rect.height }, { x: rect.x, y: rect.y }],
  ]
  for (const [a, b] of corners) {
    const hit = segmentIntersection({ x: cx, y: cy }, target, a, b)
    if (hit) return hit
  }
  return { x: cx, y: cy }
}

// Line from ellipse center toward `target`; returns the ellipse-boundary point.
export const ellipseEdgeIntersection = (box: BBox, target: Point): Point | null => {
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  const a = box.width / 2
  const b = box.height / 2
  if (a === 0 || b === 0) return null

  const dx = target.x - cx
  const dy = target.y - cy
  if (dx === 0 && dy === 0) return { x: cx, y: cy }

  // Parametric ellipse: (x,y) = (cx + a·cosθ, cy + b·sinθ).
  // Solve for θ along the ray from (cx,cy) to target:
  const t = 1 / Math.sqrt((dx * dx) / (a * a) + (dy * dy) / (b * b))
  return { x: cx + dx * t, y: cy + dy * t }
}

// Triangle inscribed in bbox: apex top-center, base along the bottom.
// Returns the triangle-edge point where a line from the triangle centroid toward `target` exits.
export const triangleEdgeIntersection = (box: BBox, target: Point): Point | null => {
  const apex: Point = { x: box.x + box.width / 2, y: box.y }
  const baseL: Point = { x: box.x, y: box.y + box.height }
  const baseR: Point = { x: box.x + box.width, y: box.y + box.height }
  const centroid: Point = {
    x: (apex.x + baseL.x + baseR.x) / 3,
    y: (apex.y + baseL.y + baseR.y) / 3,
  }
  const sides: readonly [Point, Point][] = [[apex, baseR], [baseR, baseL], [baseL, apex]]
  for (const [a, b] of sides) {
    const hit = segmentIntersection(centroid, target, a, b)
    if (hit) return hit
  }
  return null
}

export const snapToGrid = (value: number, step: number): number =>
  step <= 0 ? value : Math.round(value / step) * step

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)
