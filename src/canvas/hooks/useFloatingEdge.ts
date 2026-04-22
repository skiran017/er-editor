import { useStore, type Node as RfNode } from '@xyflow/react'
import { useMemo } from 'react'
import type { Point } from '@/domain/types'

// Minimal shape the pure helpers read from. RfNode is a superset.
export interface FloatableNode {
  readonly id: string
  readonly position: { x: number; y: number }
  readonly measured?: { width?: number; height?: number }
  readonly width?: number
  readonly height?: number
}

const centre = (n: FloatableNode): Point => {
  const w = n.measured?.width ?? n.width ?? 0
  const h = n.measured?.height ?? n.height ?? 0
  return { x: n.position.x + w / 2, y: n.position.y + h / 2 }
}

// Intersect the line from centre(b) → centre(a) with the bbox of a. Adapted
// from React Flow's official floating-edges example.
export const getNodeIntersection = (a: FloatableNode, b: FloatableNode): Point => {
  const w = (a.measured?.width ?? a.width ?? 0) / 2
  const h = (a.measured?.height ?? a.height ?? 0) / 2
  const ca = centre(a)
  const cb = centre(b)
  const dx = cb.x - ca.x
  const dy = cb.y - ca.y
  const sum = Math.abs(dx) / w + Math.abs(dy) / h
  if (!Number.isFinite(sum) || sum === 0) return { x: ca.x, y: ca.y }
  const xx3 = dx / sum / w
  const yy3 = dy / sum / h
  return { x: ca.x + xx3 * w, y: ca.y + yy3 * h }
}

export type EdgePosition = 'top' | 'right' | 'bottom' | 'left'

export const edgePosition = (n: FloatableNode, p: Point): EdgePosition => {
  const w = n.measured?.width ?? n.width ?? 0
  const h = n.measured?.height ?? n.height ?? 0
  const left = n.position.x
  const right = left + w
  const top = n.position.y
  const bottom = top + h
  const rx = Math.abs(p.x - right)
  const lx = Math.abs(p.x - left)
  const ty = Math.abs(p.y - top)
  const by = Math.abs(p.y - bottom)
  const min = Math.min(rx, lx, ty, by)
  if (min === rx) return 'right'
  if (min === lx) return 'left'
  if (min === ty) return 'top'
  return 'bottom'
}

export interface FloatingAttachment {
  readonly sx: number
  readonly sy: number
  readonly tx: number
  readonly ty: number
  readonly sourcePosition: EdgePosition
  readonly targetPosition: EdgePosition
}

// React-Flow hook: resolves source + target nodes from the live RF store, then
// computes the float-attachment points. Returns null while either node is
// still unmeasured (first frame).
export const useFloatingEdge = (
  sourceId: string,
  targetId: string,
): FloatingAttachment | null => {
  const sourceNode = useStore((s) => s.nodeLookup.get(sourceId) as RfNode | undefined)
  const targetNode = useStore((s) => s.nodeLookup.get(targetId) as RfNode | undefined)
  return useMemo(() => {
    if (!sourceNode || !targetNode) return null
    const s = sourceNode as unknown as FloatableNode
    const t = targetNode as unknown as FloatableNode
    const sp = getNodeIntersection(s, t)
    const tp = getNodeIntersection(t, s)
    return {
      sx: sp.x,
      sy: sp.y,
      tx: tp.x,
      ty: tp.y,
      sourcePosition: edgePosition(s, sp),
      targetPosition: edgePosition(t, tp),
    }
  }, [sourceNode, targetNode])
}
