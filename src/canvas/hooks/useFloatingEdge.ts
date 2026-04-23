import { useInternalNode } from '@xyflow/react'
import { useMemo } from 'react'
import type { Point } from '@/domain/types'

// Minimal shape the pure helpers read from. RfNode / InternalNode are supersets.
export interface FloatableNode {
  readonly id: string
  readonly position: { x: number; y: number }
  readonly measured?: { width?: number; height?: number }
  readonly width?: number
  readonly height?: number
}

const hasDimensions = (n: FloatableNode): boolean => {
  const w = n.measured?.width ?? n.width ?? 0
  const h = n.measured?.height ?? n.height ?? 0
  return w > 0 && h > 0
}

export type EdgePosition = 'top' | 'right' | 'bottom' | 'left'

// Snap attachment strategy: each node exposes FOUR connection ports — the
// midpoints of its bounding box (top, right, bottom, left). Edges pick the
// port whose OUTWARD axis best matches the direction toward the other end.
// For a diamond (relationship) those four points are the four vertices, so
// the same code covers rectangles, diamonds, ellipses, and triangles.
//
// This replaces the earlier "centre-to-centre intersection with the bbox"
// approach, which could attach edges arbitrarily close to a corner and
// caused the cardinality-1 arrow to overlap with the adjacent side's stroke
// (arrow appeared clipped / hidden until the user rearranged the nodes).

/**
 * Pick which side of `a` a line toward `b`'s centre should exit from.
 * Chooses the axis (horizontal vs vertical) with the larger offset in
 * half-size-scaled space — that's the side "closest" to `b` relative to
 * the bbox's aspect ratio.
 */
export const chooseSide = (a: FloatableNode, b: FloatableNode): EdgePosition => {
  const wA = (a.measured?.width ?? a.width ?? 0) || 1
  const hA = (a.measured?.height ?? a.height ?? 0) || 1
  const wB = b.measured?.width ?? b.width ?? 0
  const hB = b.measured?.height ?? b.height ?? 0
  const aCx = a.position.x + wA / 2
  const aCy = a.position.y + hA / 2
  const bCx = b.position.x + wB / 2
  const bCy = b.position.y + hB / 2
  const dx = bCx - aCx
  const dy = bCy - aCy
  if (Math.abs(dx) / (wA / 2) > Math.abs(dy) / (hA / 2)) {
    return dx >= 0 ? 'right' : 'left'
  }
  return dy >= 0 ? 'bottom' : 'top'
}

/** Cardinal midpoint of the given side, in world coordinates. */
export const sidePort = (n: FloatableNode, side: EdgePosition): Point => {
  const w = n.measured?.width ?? n.width ?? 0
  const h = n.measured?.height ?? n.height ?? 0
  const x = n.position.x
  const y = n.position.y
  switch (side) {
    case 'top': return { x: x + w / 2, y }
    case 'right': return { x: x + w, y: y + h / 2 }
    case 'bottom': return { x: x + w / 2, y: y + h }
    case 'left': return { x, y: y + h / 2 }
  }
}

// Re-exported for any external code that still wants the raw intersection
// helper (used, for instance, by the connection-preview overlay).
export const getNodeIntersection = (a: FloatableNode, b: FloatableNode): Point =>
  sidePort(a, chooseSide(a, b))

export interface FloatingAttachment {
  readonly sx: number
  readonly sy: number
  readonly tx: number
  readonly ty: number
  readonly sourcePosition: EdgePosition
  readonly targetPosition: EdgePosition
}

// React-Flow hook: subscribes to the source + target InternalNodes (v12's
// per-node subscription that correctly re-renders on measurement updates),
// then computes the port-snapped attachment. Returns null while either node
// is unresolved or unmeasured (first frame).
export const useFloatingEdge = (
  sourceId: string,
  targetId: string,
): FloatingAttachment | null => {
  const sourceNode = useInternalNode(sourceId)
  const targetNode = useInternalNode(targetId)
  return useMemo(() => {
    if (!sourceNode || !targetNode) return null
    const s = sourceNode as unknown as FloatableNode
    const t = targetNode as unknown as FloatableNode
    if (!hasDimensions(s) || !hasDimensions(t)) return null
    const sSide = chooseSide(s, t)
    const tSide = chooseSide(t, s)
    const sp = sidePort(s, sSide)
    const tp = sidePort(t, tSide)
    return {
      sx: sp.x,
      sy: sp.y,
      tx: tp.x,
      ty: tp.y,
      sourcePosition: sSide,
      targetPosition: tSide,
    }
  }, [sourceNode, targetNode])
}
