import { useInternalNode } from '@xyflow/react'
import { useMemo } from 'react'
import { useDiagramStore } from '@/state/diagramStore'
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

// ——— collision-aware port assignment ———
//
// When two edges incident to the same node both prefer the same cardinal
// side, they'd stack onto one port and the fork reads as a confusing
// overlap (the user's "both edges exiting Relationship 1's right vertex"
// case). Resolution: the edge whose direction aligns best with the side's
// central axis keeps that port; others rotate to the nearest UNUSED side.
// If all four sides are taken, the remaining edges fall back to stacking.

const SIDE_ANGLE: Record<EdgePosition, number> = {
  right: 0,
  bottom: Math.PI / 2,
  left: Math.PI,
  top: -Math.PI / 2,
}
const ALL_SIDES: readonly EdgePosition[] = ['right', 'bottom', 'left', 'top']

const angularDist = (a: number, b: number): number => {
  let d = Math.abs(a - b) % (2 * Math.PI)
  if (d > Math.PI) d = 2 * Math.PI - d
  return d
}

const centreOf = (n: FloatableNode): Point => {
  const w = n.measured?.width ?? n.width ?? 0
  const h = n.measured?.height ?? n.height ?? 0
  return { x: n.position.x + w / 2, y: n.position.y + h / 2 }
}

interface IncidentEdge {
  readonly edgeId: string
  readonly other: FloatableNode
}

/**
 * For a single node, decide which cardinal side each incident edge should
 * attach to. Collision-aware: if `n` of its edges all prefer the same side,
 * the best-aligned one keeps it and the rest rotate to the nearest unused
 * sides (round-robin around the 4 cardinals). Returns a map keyed by edge id.
 */
export const assignNodePorts = (
  node: FloatableNode,
  incident: readonly IncidentEdge[],
): Map<string, EdgePosition> => {
  const nodeCentre = centreOf(node)
  const entries = incident.map(({ edgeId, other }) => {
    const side = chooseSide(node, other)
    const oc = centreOf(other)
    const angle = Math.atan2(oc.y - nodeCentre.y, oc.x - nodeCentre.x)
    return { edgeId, side, angle }
  })

  // Group by preferred side.
  const bySide: Record<EdgePosition, typeof entries> = { top: [], right: [], bottom: [], left: [] }
  for (const e of entries) bySide[e.side].push(e)

  const assignment = new Map<string, EdgePosition>()
  const used = new Set<EdgePosition>()

  // First pass: every side group assigns its "primary" edge (best-aligned
  // with the side's central angle).
  for (const side of ALL_SIDES) {
    const group = bySide[side]
    if (group.length === 0) continue
    const primary = [...group].sort(
      (a, b) => angularDist(a.angle, SIDE_ANGLE[side]) - angularDist(b.angle, SIDE_ANGLE[side]),
    )[0]!
    assignment.set(primary.edgeId, side)
    used.add(side)
  }

  // Second pass: displaced edges (those that weren't primary) go to the
  // nearest UNUSED cardinal side based on their angle. If every side is
  // taken, fall back to the original preference (stack).
  for (const e of entries) {
    if (assignment.has(e.edgeId)) continue
    const candidates = ALL_SIDES
      .filter((s) => !used.has(s))
      .sort((a, b) => angularDist(e.angle, SIDE_ANGLE[a]) - angularDist(e.angle, SIDE_ANGLE[b]))
    const picked = candidates[0] ?? e.side
    assignment.set(e.edgeId, picked)
    used.add(picked)
  }

  return assignment
}

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
//
// If `edgeId` is supplied, the chosen sides are collision-aware against
// every OTHER edge incident to the same source / target node — so two
// edges from the same node don't both stack onto the same cardinal port.
// When edgeId is omitted (e.g. the connection-preview overlay mid-drag,
// where no edge exists yet), the naive best-side-per-node is used.
export const useFloatingEdge = (
  sourceId: string,
  targetId: string,
  edgeId?: string,
): FloatingAttachment | null => {
  const sourceNode = useInternalNode(sourceId)
  const targetNode = useInternalNode(targetId)
  const diagram = useDiagramStore((s) => s.diagram)

  return useMemo(() => {
    if (!sourceNode || !targetNode) return null
    const s = sourceNode as unknown as FloatableNode
    const t = targetNode as unknown as FloatableNode
    if (!hasDimensions(s) || !hasDimensions(t)) return null

    const sSide = resolveSide(s, sourceId, edgeId, diagram) ?? chooseSide(s, t)
    const tSide = resolveSide(t, targetId, edgeId, diagram) ?? chooseSide(t, s)
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
  }, [sourceNode, targetNode, sourceId, targetId, edgeId, diagram])
}

// Resolve the chosen side for one end of `edgeId` attached to `nodeId`, using
// the collision-aware assignment over ALL edges incident to that node. Returns
// null when the node / edge can't be found (caller falls back to naive
// chooseSide).
const resolveSide = (
  node: FloatableNode,
  nodeId: string,
  edgeId: string | undefined,
  diagram: ReturnType<typeof useDiagramStore.getState>['diagram'],
): EdgePosition | null => {
  if (!edgeId) return null
  const incident: IncidentEdge[] = []
  for (const eid of diagram.edgeOrder) {
    const e = diagram.edgesById[eid]
    if (!e) continue
    const otherId =
      e.sourceId === nodeId ? e.targetId :
      e.targetId === nodeId ? e.sourceId :
      null
    if (!otherId) continue
    const other = diagram.nodesById[otherId]
    if (!other) continue
    // Domain nodes have position + size — shape-compatible with FloatableNode.
    incident.push({
      edgeId: eid,
      other: {
        id: other.id,
        position: other.position,
        width: other.size.width,
        height: other.size.height,
      },
    })
  }
  if (incident.length === 0) return null
  const map = assignNodePorts(node, incident)
  return map.get(edgeId) ?? null
}
