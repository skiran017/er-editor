import { useInternalNode } from '@xyflow/react'
import { useMemo } from 'react'
import { useDiagramStore } from '@/state/diagramStore'
import type { EdgeId, NodeId, Point } from '@/domain/types'

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

/**
 * Port location along the given side. With `offset` = 0 (default) returns the
 * cardinal midpoint; offset ∈ [-1, +1] slides the port along the side from
 * one end (-1) to the other (+1). For top/bottom the offset varies the x
 * coordinate; for left/right it varies the y coordinate. Used to distribute
 * multiple edges sharing the same side so they don't visually stack at the
 * midpoint.
 */
export const sidePort = (n: FloatableNode, side: EdgePosition, offset = 0): Point => {
  const w = n.measured?.width ?? n.width ?? 0
  const h = n.measured?.height ?? n.height ?? 0
  const x = n.position.x
  const y = n.position.y
  const tx = 0.5 + offset / 2  // [-1,+1] → [0,1] along the side
  const ty = 0.5 + offset / 2
  switch (side) {
    case 'top': return { x: x + w * tx, y }
    case 'right': return { x: x + w, y: y + h * ty }
    case 'bottom': return { x: x + w * tx, y: y + h }
    case 'left': return { x, y: y + h * ty }
  }
}

/**
 * ISA-triangle-aware port. The ISA glyph is an inverted triangle with
 * vertices at `(0, 0)`, `(w, 0)` and `(w/2, h)`. The bbox cardinals leave
 * visible gaps on the slanted left/right edges — at `y = h/2` the triangle
 * boundary is at `x = w/4` (left) / `x = 3w/4` (right), NOT at the bbox
 * edge. Project those ports onto the midpoints of the slanted edges so
 * incoming lines visually touch the shape. `top` and `bottom` already
 * coincide with real triangle points (base centre + apex) so pass through.
 */
export const isaTrianglePort = (n: FloatableNode, side: EdgePosition): Point => {
  const w = n.measured?.width ?? n.width ?? 0
  const h = n.measured?.height ?? n.height ?? 0
  const x = n.position.x
  const y = n.position.y
  switch (side) {
    case 'top': return { x: x + w / 2, y }
    case 'bottom': return { x: x + w / 2, y: y + h }
    case 'left': return { x: x + w / 4, y: y + h / 2 }
    case 'right': return { x: x + 3 * w / 4, y: y + h / 2 }
  }
}

// Re-exported for any external code that still wants the raw intersection
// helper (used, for instance, by the connection-preview overlay).
export const getNodeIntersection = (a: FloatableNode, b: FloatableNode): Point =>
  sidePort(a, chooseSide(a, b))

// ISA nodes are inverted triangles. The single parent-edge always enters at
// the top-midpoint (centre of the base) — locked there so there's no
// ambiguity about which leg is the superclass. Children are free to use any
// other side (right / bottom / left) and pick their natural direction via
// the collision-aware assignment with `top` forbidden.
export const ISA_PARENT_SIDE: EdgePosition = 'top'
const ISA_CHILD_FORBIDDEN: ReadonlySet<EdgePosition> = new Set(['top'])

// Collect every child-role ISA edge leaving `isaId` as a bundle that
// assignNodePorts can reason about together. Pulled out of resolveSide so
// that function stays within the lint complexity cap.
const collectIsaChildIncidents = (
  isaId: string,
  diagram: ReturnType<typeof useDiagramStore.getState>['diagram'],
): IncidentEdge[] => {
  const out: IncidentEdge[] = []
  for (const eid of diagram.edgeOrder) {
    const e = diagram.edgesById[eid]
    if (!e || e.kind !== 'isa-link' || e.role !== 'child') continue
    if (e.sourceId !== isaId) continue
    const other = diagram.nodesById[e.targetId]
    if (!other) continue
    out.push({
      edgeId: eid,
      other: {
        id: other.id,
        position: other.position,
        width: other.size.width,
        height: other.size.height,
      },
    })
  }
  return out
}

// Decide the port for one end of an ISA edge, or return undefined when the
// node/edge pair isn't an ISA case. undefined lets resolveSide fall through
// to the generic assignment logic. Keeping this out-of-line keeps resolveSide
// flat and readable.
const resolveIsaSideIfApplicable = (
  node: FloatableNode,
  nodeId: string,
  edgeId: string,
  diagram: ReturnType<typeof useDiagramStore.getState>['diagram'],
): EdgePosition | undefined => {
  const domainNode = diagram.nodesById[nodeId as NodeId]
  if (!domainNode || domainNode.kind !== 'isa') return undefined
  const edge = diagram.edgesById[edgeId as EdgeId]
  if (!edge || edge.kind !== 'isa-link') return undefined
  if (edge.role === 'parent') return ISA_PARENT_SIDE
  const children = collectIsaChildIncidents(nodeId, diagram)
  if (children.length === 0) return 'bottom'
  const map = assignNodePorts(node, children, { forbidden: ISA_CHILD_FORBIDDEN })
  return map.get(edgeId) ?? 'bottom'
}

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

// Parallel edges (two or more edges between the SAME pair of nodes — e.g. a
// recursive relationship where the same entity plays two roles) would normally
// all prefer the same side and collide. Forcing the 2nd / 3rd / ... parallel
// edge onto a perpendicular cardinal (top, then bottom) on BOTH ends produces
// a clean "bridge" loop over (or under) the primary edge. Because the same
// deterministic rule is applied per-node, both endpoints of the same edge
// end up on the SAME cardinal → getSmoothStepPath routes it symmetrically.
const PARALLEL_OVERRIDES: readonly EdgePosition[] = ['top', 'bottom']

export interface AssignNodePortsOptions {
  // Sides the algorithm is NOT allowed to pick. Used by ISA nodes to keep
  // their children off the top cardinal — that port is reserved for the
  // single parent edge, whose routing is locked by the caller upstream.
  readonly forbidden?: ReadonlySet<EdgePosition>
}

const EMPTY_FORBIDDEN: ReadonlySet<EdgePosition> = new Set()

/**
 * For a single node, decide which cardinal side each incident edge should
 * attach to. Collision-aware: if `n` of its edges all prefer the same side,
 * the best-aligned one keeps it and the rest rotate to the nearest unused
 * sides (round-robin around the 4 cardinals). Returns a map keyed by edge id.
 *
 * Parallel edges (multiple edges to the same neighbour) get priority overrides
 * onto top/bottom so a recursive pair doesn't overlap into the same port.
 *
 * `options.forbidden` excludes sides from consideration entirely — any edge
 * whose natural side falls on a forbidden cardinal gets redirected to the
 * nearest allowed one before grouping.
 */
interface PortEntry {
  readonly edgeId: string
  readonly otherId: string
  readonly side: EdgePosition
  readonly angle: number
}

// Build a PortEntry per incident edge, redirecting any entry whose natural
// side falls on a forbidden cardinal to the nearest allowed one.
const buildEntries = (
  node: FloatableNode,
  incident: readonly IncidentEdge[],
  forbidden: ReadonlySet<EdgePosition>,
  allowedSides: readonly EdgePosition[],
): readonly PortEntry[] => {
  const nodeCentre = centreOf(node)
  return incident.map(({ edgeId, other }) => {
    const natural = chooseSide(node, other)
    const oc = centreOf(other)
    const angle = Math.atan2(oc.y - nodeCentre.y, oc.x - nodeCentre.x)
    const side = forbidden.has(natural)
      ? [...allowedSides].sort(
          (a, b) => angularDist(angle, SIDE_ANGLE[a]) - angularDist(angle, SIDE_ANGLE[b]),
        )[0] ?? natural
      : natural
    return { edgeId, otherId: other.id, side, angle }
  })
}

// Pass 1 — parallel-edge overrides. Mutates `assignment` + `used`.
const assignParallelOverrides = (
  entries: readonly PortEntry[],
  forbidden: ReadonlySet<EdgePosition>,
  assignment: Map<string, EdgePosition>,
  used: Set<EdgePosition>,
): void => {
  const parallelOverrides = PARALLEL_OVERRIDES.filter((s) => !forbidden.has(s))
  if (parallelOverrides.length === 0) return
  const byOther = new Map<string, PortEntry[]>()
  for (const e of entries) {
    const arr = byOther.get(e.otherId) ?? []
    arr.push(e)
    byOther.set(e.otherId, arr)
  }
  for (const group of byOther.values()) {
    if (group.length < 2) continue
    const sorted = [...group].sort((a, b) => a.edgeId.localeCompare(b.edgeId))
    for (let i = 1; i < sorted.length; i++) {
      const override = parallelOverrides[(i - 1) % parallelOverrides.length]!
      if (used.has(override)) continue
      assignment.set(sorted[i]!.edgeId, override)
      used.add(override)
    }
  }
}

// Pass 2 — per-side primary: pick the best-aligned unassigned edge for every
// still-unclaimed allowed side.
const assignPrimaries = (
  entries: readonly PortEntry[],
  allowedSides: readonly EdgePosition[],
  assignment: Map<string, EdgePosition>,
  used: Set<EdgePosition>,
): void => {
  const bySide: Record<EdgePosition, PortEntry[]> = { top: [], right: [], bottom: [], left: [] }
  for (const e of entries) {
    if (assignment.has(e.edgeId)) continue
    bySide[e.side].push(e)
  }
  for (const side of allowedSides) {
    if (used.has(side)) continue
    const group = bySide[side]
    if (group.length === 0) continue
    const primary = [...group].sort(
      (a, b) => angularDist(a.angle, SIDE_ANGLE[side]) - angularDist(b.angle, SIDE_ANGLE[side]),
    )[0]!
    assignment.set(primary.edgeId, side)
    used.add(side)
  }
}

// Pass 3 — displaced fallback: any edge still unassigned rotates to the
// nearest unused allowed cardinal, else stacks on the first allowed side.
const assignDisplaced = (
  entries: readonly PortEntry[],
  allowedSides: readonly EdgePosition[],
  assignment: Map<string, EdgePosition>,
  used: Set<EdgePosition>,
): void => {
  for (const e of entries) {
    if (assignment.has(e.edgeId)) continue
    const candidates = allowedSides
      .filter((s) => !used.has(s))
      .sort((a, b) => angularDist(e.angle, SIDE_ANGLE[a]) - angularDist(e.angle, SIDE_ANGLE[b]))
    const picked = candidates[0] ?? allowedSides[0] ?? e.side
    assignment.set(e.edgeId, picked)
    used.add(picked)
  }
}

export const assignNodePorts = (
  node: FloatableNode,
  incident: readonly IncidentEdge[],
  options: AssignNodePortsOptions = {},
): Map<string, EdgePosition> => {
  const forbidden = options.forbidden ?? EMPTY_FORBIDDEN
  const allowedSides = ALL_SIDES.filter((s) => !forbidden.has(s))
  const entries = buildEntries(node, incident, forbidden, allowedSides)

  const assignment = new Map<string, EdgePosition>()
  // Pre-mark forbidden sides as used so later passes never claim them.
  const used = new Set<EdgePosition>(forbidden)

  assignParallelOverrides(entries, forbidden, assignment, used)
  assignPrimaries(entries, allowedSides, assignment, used)
  assignDisplaced(entries, allowedSides, assignment, used)

  return assignment
}

// ——— along-side offset distribution ———

// Fraction of a side's length used for distributed ports — 70% means the
// outermost ports sit 15% from each corner, leaving room so edges still
// clearly belong to the side they exit (and don't visually merge into the
// adjacent corner).
const SIDE_OFFSET_SPREAD = 0.7

const projectAngleAlongSide = (side: EdgePosition, angle: number): number => {
  // The output ranges in [-1, +1] and gives the natural ordering of where
  // an edge "wants" to sit along the side, based on its approach angle.
  // For horizontal sides (top/bottom): cos(angle) is -1 (left) ... +1 (right).
  // For vertical sides (left/right): sin(angle) is -1 (up) ... +1 (down).
  return side === 'top' || side === 'bottom' ? Math.cos(angle) : Math.sin(angle)
}

/**
 * Compute per-edge along-side offsets for edges sharing a side. Multiple
 * incident edges with the same `assignedSide` get spread evenly across
 * `SIDE_OFFSET_SPREAD` of that side; edges alone on a side stay at the
 * midpoint (offset 0). Returns a map keyed by edgeId.
 */
export const distributePortOffsets = (
  node: FloatableNode,
  incident: readonly IncidentEdge[],
  assignment: ReadonlyMap<string, EdgePosition>,
): Map<string, number> => {
  const nodeCentre = centreOf(node)
  // Build per-side groups with each edge's approach angle.
  const bySide: Record<EdgePosition, { edgeId: string; angle: number }[]> = {
    top: [], right: [], bottom: [], left: [],
  }
  for (const { edgeId, other } of incident) {
    const side = assignment.get(edgeId)
    if (!side) continue
    const oc = centreOf(other)
    const angle = Math.atan2(oc.y - nodeCentre.y, oc.x - nodeCentre.x)
    bySide[side].push({ edgeId, angle })
  }
  const result = new Map<string, number>()
  for (const side of ALL_SIDES) {
    const group = bySide[side]
    if (group.length === 0) continue
    if (group.length === 1) {
      result.set(group[0]!.edgeId, 0)
      continue
    }
    const sorted = [...group].sort(
      (a, b) => projectAngleAlongSide(side, a.angle) - projectAngleAlongSide(side, b.angle),
    )
    const n = sorted.length
    sorted.forEach((entry, i) => {
      const offset = SIDE_OFFSET_SPREAD * (2 * i / (n - 1) - 1)
      result.set(entry.edgeId, offset)
    })
  }
  return result
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

    const sAtt = resolveAttachment(s, sourceId, edgeId, diagram) ?? { side: chooseSide(s, t), offset: 0 }
    const tAtt = resolveAttachment(t, targetId, edgeId, diagram) ?? { side: chooseSide(t, s), offset: 0 }
    // ISA endpoints use triangle-aware ports so lines visually touch the
    // slanted edges instead of stopping at the bbox cardinals. Other kinds
    // keep their rectangular / diamond bbox-midpoint geometry. ISA ports
    // don't take a distribution offset — the inverted-triangle apex/base
    // geometry doesn't have a meaningful "spread along the side" axis.
    const sIsIsa = diagram.nodesById[sourceId as NodeId]?.kind === 'isa'
    const tIsIsa = diagram.nodesById[targetId as NodeId]?.kind === 'isa'
    const sp = sIsIsa ? isaTrianglePort(s, sAtt.side) : sidePort(s, sAtt.side, sAtt.offset)
    const tp = tIsIsa ? isaTrianglePort(t, tAtt.side) : sidePort(t, tAtt.side, tAtt.offset)
    return {
      sx: sp.x,
      sy: sp.y,
      tx: tp.x,
      ty: tp.y,
      sourcePosition: sAtt.side,
      targetPosition: tAtt.side,
    }
  }, [sourceNode, targetNode, sourceId, targetId, edgeId, diagram])
}

// Resolve the chosen side AND along-side offset for one end of `edgeId`
// attached to `nodeId`, using the collision-aware assignment over ALL edges
// incident to that node. Returns null when the node / edge can't be found
// (caller falls back to naive chooseSide with offset 0).
//
// Special case: ISA nodes are inverted triangles, so their port geometry is
// NOT symmetric. Parent edges always enter from the top-midpoint (centre of
// the base), every child edge exits from the bottom-midpoint (the apex).
// Hard-code those ports here; the collision-aware rotation logic would
// otherwise scatter children across the sides and break the Chen visual.
// ISA returns offset 0 — its apex/base/slant geometry doesn't lend itself
// to along-side distribution.
interface ResolvedAttachment {
  readonly side: EdgePosition
  readonly offset: number
}

const resolveAttachment = (
  node: FloatableNode,
  nodeId: string,
  edgeId: string | undefined,
  diagram: ReturnType<typeof useDiagramStore.getState>['diagram'],
): ResolvedAttachment | null => {
  if (!edgeId) return null

  const isaSide = resolveIsaSideIfApplicable(node, nodeId, edgeId, diagram)
  if (isaSide !== undefined) return { side: isaSide, offset: 0 }

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
  const sides = assignNodePorts(node, incident)
  const side = sides.get(edgeId)
  if (!side) return null
  const offsets = distributePortOffsets(node, incident, sides)
  return { side, offset: offsets.get(edgeId) ?? 0 }
}
