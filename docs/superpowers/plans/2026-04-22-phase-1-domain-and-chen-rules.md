# Phase 1 — Domain Layer + Chen Validation Rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the pure-TypeScript domain layer (types, id, geometry, graph, invariants) and the full Chen validation catalog (33 rules across 4 category files) with ≥95% coverage in `domain/` and ≥90% coverage in `notation/chen/rules/`. No React, no Zustand, no rendering — this phase is pure logic and tests.

**Architecture:** Pure, notation-agnostic domain primitives live under `src/domain/`. Chen-specific validation rules are pure `(Diagram) => ValidationError[]` functions grouped by category under `src/notation/chen/rules/`. Messages are i18n keys; resolution happens at render time (Phase 4+). Test fixtures are plain-TS factories under `tests/fixtures/diagrams/` and a `@fixtures` vitest alias keeps imports clean.

**Tech Stack:** TypeScript 5.9, Vitest 3.2, nanoid 5.1, Immer 10.1 (unused in Phase 1 but declared for Phase 2). No React, no Zustand in any Phase 1 file.

---

## File Structure

```
src/
  domain/
    types.ts                          (Diagram, ERNode, ERLink, branded IDs, Point/Size/BBox)
    types.test.ts                     (expectTypeOf + empty-diagram factory test)
    id.ts                             (newNodeId, newEdgeId, 10-char nanoid)
    id.test.ts
    geometry.ts                       (pointDistance, bbox, line/rect/ellipse/triangle intersection, snap, clamp)
    geometry.test.ts
    graph.ts                          (incidentEdges, neighbors, nodesByKind, edgesByKind, hasPath, detectCycles)
    graph.test.ts
    invariants.ts                     (9 invariants → InvariantViolation[])
    invariants.test.ts
  notation/
    types.ts                          (NotationPlugin, ValidationRule, ValidationError, InvariantViolation)
    chen/
      rules/
        index.ts                      (chenRules readonly array + validateChen())
        index.test.ts                 (integration: every rule wired; totals match)
        entity.ts                     (10 rules)
        entity.test.ts
        relationship.ts               (7 rules)
        relationship.test.ts
        attribute.ts                  (12 rules)
        attribute.test.ts
        generalization.ts             (3 rules)
        generalization.test.ts
        structural.ts                 (1 rule: dangling edge ref)
        structural.test.ts
  platform/
    i18n/
      locales/
        en/validation.json            (33 rule messages + i18n keys)
        it/validation.json            (English fallback stub; Phase 7 translates)
tests/
  fixtures/
    diagrams/
      empty.ts                        (emptyDiagram factory)
      makeNode.ts                     (makeEntity, makeRelationship, makeAttribute, makeIsa)
      makeEdge.ts                     (makeEREdge, makeAttrEdge, makeIsaEdge)
      composed.ts                     (strongEntityWithKey, weakEntityWithDiscriminant, naryRel, recursiveRel, isaHierarchy, compositeAttr)
```

---

## Task 1: Domain Types

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/domain/types.test.ts`

- [ ] **Step 1: Write the domain types**

Create `src/domain/types.ts`:

```ts
// Branded ID types. Opaque at the call-site — constructable only via id.ts.
export type NodeId = string & { readonly __brand: 'NodeId' }
export type EdgeId = string & { readonly __brand: 'EdgeId' }

// Geometry primitives.
export interface Point { readonly x: number; readonly y: number }
export interface Size { readonly width: number; readonly height: number }
export interface BBox { readonly x: number; readonly y: number; readonly width: number; readonly height: number }

// Edge-participant sides.
export type Cardinality = '1' | 'N' | 'M'
export type Participation = 'total' | 'partial'

// ——— Nodes ———

interface NodeBase {
  readonly id: NodeId
  readonly position: Point
  readonly size: Size
}

export interface EntityNode extends NodeBase {
  readonly kind: 'entity'
  readonly name: string
  readonly isWeak: boolean
}

export interface RelationshipNode extends NodeBase {
  readonly kind: 'relationship'
  readonly name: string
  readonly isIdentifying: boolean
}

export interface AttributeNode extends NodeBase {
  readonly kind: 'attribute'
  readonly name: string
  readonly isKey: boolean
  readonly isDiscriminant: boolean
  readonly isMultivalued: boolean
  readonly isDerived: boolean
  readonly isComposite: boolean
}

export interface ISANode extends NodeBase {
  readonly kind: 'isa'
  readonly isTotal: boolean
}

export type ERNode = EntityNode | RelationshipNode | AttributeNode | ISANode
export type NodeKind = ERNode['kind']

// ——— Edges ———

interface EdgeBase {
  readonly id: EdgeId
  readonly sourceId: NodeId
  readonly targetId: NodeId
  readonly waypoints: readonly Point[]
}

export interface EntityRelationshipEdge extends EdgeBase {
  readonly kind: 'entity-relationship'
  readonly cardinality: Cardinality
  readonly participation: Participation
  readonly role?: string
}

export interface AttributeEdge extends EdgeBase {
  readonly kind: 'attribute-of'
}

export interface ISAEdge extends EdgeBase {
  readonly kind: 'isa-link'
  readonly role: 'parent' | 'child'
}

export type ERLink = EntityRelationshipEdge | AttributeEdge | ISAEdge
export type EdgeKind = ERLink['kind']

// ——— Diagram ———

export interface Diagram {
  readonly schemaVersion: 1
  readonly nodesById: Readonly<Record<NodeId, ERNode>>
  readonly edgesById: Readonly<Record<EdgeId, ERLink>>
  readonly nodeOrder: readonly NodeId[]
  readonly edgeOrder: readonly EdgeId[]
}

// Canonical empty-diagram factory.
export const emptyDiagram = (): Diagram => ({
  schemaVersion: 1,
  nodesById: {},
  edgesById: {},
  nodeOrder: [],
  edgeOrder: [],
})
```

- [ ] **Step 2: Write the type/factory test**

Create `src/domain/types.test.ts`:

```ts
import { describe, it, expect, expectTypeOf } from 'vitest'
import {
  emptyDiagram,
  type Diagram,
  type NodeId,
  type EdgeId,
  type ERNode,
  type ERLink,
  type EntityNode,
  type AttributeNode,
  type EntityRelationshipEdge,
} from './types'

describe('emptyDiagram', () => {
  it('produces a v1 diagram with empty maps and orders', () => {
    const d = emptyDiagram()

    expect(d.schemaVersion).toBe(1)
    expect(d.nodesById).toEqual({})
    expect(d.edgesById).toEqual({})
    expect(d.nodeOrder).toEqual([])
    expect(d.edgeOrder).toEqual([])
  })
})

describe('type shape', () => {
  it('NodeId and EdgeId are nominally distinct from string', () => {
    expectTypeOf<NodeId>().not.toEqualTypeOf<string>()
    expectTypeOf<EdgeId>().not.toEqualTypeOf<string>()
    expectTypeOf<NodeId>().not.toEqualTypeOf<EdgeId>()
  })

  it('ERNode discriminates on kind', () => {
    expectTypeOf<Extract<ERNode, { kind: 'entity' }>>().toEqualTypeOf<EntityNode>()
    expectTypeOf<Extract<ERNode, { kind: 'attribute' }>>().toEqualTypeOf<AttributeNode>()
  })

  it('ERLink discriminates on kind', () => {
    expectTypeOf<Extract<ERLink, { kind: 'entity-relationship' }>>().toEqualTypeOf<EntityRelationshipEdge>()
  })

  it('Diagram maps are readonly', () => {
    expectTypeOf<Diagram['nodesById']>().toEqualTypeOf<Readonly<Record<NodeId, ERNode>>>()
  })
})
```

- [ ] **Step 3: Run tests + typecheck**

Run: `pnpm test -- src/domain/types.test.ts`
Expected: 5 tests pass.

Run: `pnpm typecheck`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/domain/types.ts src/domain/types.test.ts
git commit -F /tmp/phase1-task1-msg.txt
```

Write `/tmp/phase1-task1-msg.txt` first:

```
feat(domain): add Diagram/ERNode/ERLink types and emptyDiagram factory

Branded NodeId/EdgeId, Point/Size/BBox primitives, discriminated
unions for nodes and edges, and the indexed Diagram container per
spec §3.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

---

## Task 2: ID Generation

**Files:**
- Create: `src/domain/id.ts`
- Create: `src/domain/id.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/domain/id.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { newNodeId, newEdgeId, asNodeId, asEdgeId } from './id'

describe('newNodeId / newEdgeId', () => {
  it('returns 10-char strings', () => {
    expect(newNodeId()).toHaveLength(10)
    expect(newEdgeId()).toHaveLength(10)
  })

  it('returns URL-safe characters only', () => {
    const nodeId = newNodeId()
    const edgeId = newEdgeId()
    expect(nodeId).toMatch(/^[A-Za-z0-9_-]{10}$/)
    expect(edgeId).toMatch(/^[A-Za-z0-9_-]{10}$/)
  })

  it('produces unique ids across 1000 calls', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => newNodeId()))
    expect(ids.size).toBe(1000)
  })
})

describe('asNodeId / asEdgeId', () => {
  it('brands an existing string (for codec import paths)', () => {
    const raw = 'abc1234567'
    expect(asNodeId(raw)).toBe(raw)
    expect(asEdgeId(raw)).toBe(raw)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/domain/id.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/domain/id.ts`:

```ts
import { nanoid } from 'nanoid'
import type { NodeId, EdgeId } from './types'

const ID_LENGTH = 10

export const newNodeId = (): NodeId => nanoid(ID_LENGTH) as NodeId
export const newEdgeId = (): EdgeId => nanoid(ID_LENGTH) as EdgeId

export const asNodeId = (raw: string): NodeId => raw as NodeId
export const asEdgeId = (raw: string): EdgeId => raw as EdgeId
```

- [ ] **Step 4: Run tests**

Run: `pnpm test -- src/domain/id.test.ts`
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/domain/id.ts src/domain/id.test.ts
git commit -F /tmp/phase1-task2-msg.txt
```

`/tmp/phase1-task2-msg.txt`:

```
feat(domain): add branded id generators (10-char nanoid)

newNodeId/newEdgeId for fresh ids; asNodeId/asEdgeId for branding
existing strings during codec import (Java XML numeric → NodeId).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

---

## Task 3: Geometry

**Files:**
- Create: `src/domain/geometry.ts`
- Create: `src/domain/geometry.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/domain/geometry.test.ts`:

```ts
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
import type { BBox, Point } from './types'

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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- src/domain/geometry.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/domain/geometry.ts`:

```ts
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
```

- [ ] **Step 4: Run tests**

Run: `pnpm test -- src/domain/geometry.test.ts`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/domain/geometry.ts src/domain/geometry.test.ts
git commit -F /tmp/phase1-task3-msg.txt
```

`/tmp/phase1-task3-msg.txt`:

```
feat(domain): add geometry primitives

pointDistance, bbox helpers, segment intersection, rect/ellipse/
triangle edge intersection for node-glyph attachment points,
snapToGrid and clamp helpers. Pure, framework-free.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

---

## Task 4: Graph Operations

**Files:**
- Create: `src/domain/graph.ts`
- Create: `src/domain/graph.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/domain/graph.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  incidentEdges,
  neighbors,
  nodesByKind,
  edgesByKind,
  hasPath,
  isEntityNode,
  isRelationshipNode,
  isAttributeNode,
  isIsaNode,
  isEntityRelationshipEdge,
  isAttributeEdge,
  isIsaEdge,
} from './graph'
import { asNodeId, asEdgeId } from './id'
import type { Diagram, EntityNode, AttributeNode, AttributeEdge, EntityRelationshipEdge } from './types'

// Inline minimal diagram for graph tests (full fixtures land in Task 6).
const e1 = asNodeId('entity0001')
const e2 = asNodeId('entity0002')
const r1 = asNodeId('rel0000001')
const a1 = asNodeId('attr000001')
const edge1 = asEdgeId('edge000001')
const edge2 = asEdgeId('edge000002')
const edge3 = asEdgeId('edge000003')

const entityAt = (id: typeof e1, name: string): EntityNode => ({
  id, kind: 'entity', name, isWeak: false,
  position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
})

const attrAt = (id: typeof a1, name: string): AttributeNode => ({
  id, kind: 'attribute', name,
  isKey: false, isDiscriminant: false, isMultivalued: false, isDerived: false, isComposite: false,
  position: { x: 0, y: 0 }, size: { width: 90, height: 50 },
})

const erEdge = (id: typeof edge1, from: typeof e1, to: typeof r1): EntityRelationshipEdge => ({
  id, kind: 'entity-relationship', sourceId: from, targetId: to,
  cardinality: '1', participation: 'partial', waypoints: [],
})

const attrEdge = (id: typeof edge1, from: typeof a1, to: typeof e1): AttributeEdge => ({
  id, kind: 'attribute-of', sourceId: from, targetId: to, waypoints: [],
})

const diagram: Diagram = {
  schemaVersion: 1,
  nodesById: {
    [e1]: entityAt(e1, 'Student'),
    [e2]: entityAt(e2, 'Course'),
    [r1]: { id: r1, kind: 'relationship', name: 'Enrolls', isIdentifying: false,
      position: { x: 0, y: 0 }, size: { width: 140, height: 70 } },
    [a1]: attrAt(a1, 'name'),
  },
  edgesById: {
    [edge1]: erEdge(edge1, e1, r1),
    [edge2]: erEdge(edge2, e2, r1),
    [edge3]: attrEdge(edge3, a1, e1),
  },
  nodeOrder: [e1, e2, r1, a1],
  edgeOrder: [edge1, edge2, edge3],
}

describe('incidentEdges', () => {
  it('returns all edges touching the node', () => {
    const result = incidentEdges(diagram, e1).map((e) => e.id)
    expect(result).toEqual(expect.arrayContaining([edge1, edge3]))
    expect(result).toHaveLength(2)
  })
  it('returns [] for an unknown node', () => {
    expect(incidentEdges(diagram, asNodeId('missing000'))).toEqual([])
  })
})

describe('neighbors', () => {
  it('returns both endpoints of incident edges excluding self', () => {
    const ns = neighbors(diagram, r1).sort()
    expect(ns).toEqual([e1, e2].sort())
  })
  it('filters by edge kind', () => {
    const ns = neighbors(diagram, e1, { edgeKind: 'attribute-of' })
    expect(ns).toEqual([a1])
  })
})

describe('nodesByKind', () => {
  it('returns nodes matching the kind in nodeOrder order', () => {
    const entities = nodesByKind(diagram, 'entity').map((n) => n.id)
    expect(entities).toEqual([e1, e2])
  })
})

describe('edgesByKind', () => {
  it('returns edges matching the kind in edgeOrder order', () => {
    const ers = edgesByKind(diagram, 'entity-relationship').map((e) => e.id)
    expect(ers).toEqual([edge1, edge2])
  })
})

describe('hasPath', () => {
  it('true for reachable nodes (e1 → r1 → e2)', () => {
    expect(hasPath(diagram, e1, e2)).toBe(true)
  })
  it('true for self', () => {
    expect(hasPath(diagram, e1, e1)).toBe(true)
  })
  it('false for unconnected nodes', () => {
    const isolated = asNodeId('iso0000001')
    const d2: Diagram = { ...diagram, nodesById: {
      ...diagram.nodesById,
      [isolated]: entityAt(isolated, 'Island'),
    }, nodeOrder: [...diagram.nodeOrder, isolated] }
    expect(hasPath(d2, e1, isolated)).toBe(false)
  })
})

describe('node type guards', () => {
  it('correctly discriminates', () => {
    expect(isEntityNode(diagram.nodesById[e1])).toBe(true)
    expect(isRelationshipNode(diagram.nodesById[r1])).toBe(true)
    expect(isAttributeNode(diagram.nodesById[a1])).toBe(true)
    expect(isIsaNode(diagram.nodesById[e1])).toBe(false)
  })
})

describe('edge type guards', () => {
  it('correctly discriminates', () => {
    expect(isEntityRelationshipEdge(diagram.edgesById[edge1])).toBe(true)
    expect(isAttributeEdge(diagram.edgesById[edge3])).toBe(true)
    expect(isIsaEdge(diagram.edgesById[edge1])).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/domain/graph.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/domain/graph.ts`:

```ts
import type {
  Diagram, NodeId, ERNode, ERLink, NodeKind, EdgeKind,
  EntityNode, RelationshipNode, AttributeNode, ISANode,
  EntityRelationshipEdge, AttributeEdge, ISAEdge,
} from './types'

export const incidentEdges = (diagram: Diagram, nodeId: NodeId): readonly ERLink[] =>
  diagram.edgeOrder
    .map((id) => diagram.edgesById[id])
    .filter((e): e is ERLink => !!e && (e.sourceId === nodeId || e.targetId === nodeId))

export const neighbors = (
  diagram: Diagram,
  nodeId: NodeId,
  opts?: { edgeKind?: EdgeKind },
): readonly NodeId[] => {
  const out: NodeId[] = []
  for (const edge of incidentEdges(diagram, nodeId)) {
    if (opts?.edgeKind && edge.kind !== opts.edgeKind) continue
    const other = edge.sourceId === nodeId ? edge.targetId : edge.sourceId
    out.push(other)
  }
  return out
}

export const nodesByKind = <K extends NodeKind>(
  diagram: Diagram,
  kind: K,
): readonly Extract<ERNode, { kind: K }>[] =>
  diagram.nodeOrder
    .map((id) => diagram.nodesById[id])
    .filter((n): n is Extract<ERNode, { kind: K }> => !!n && n.kind === kind)

export const edgesByKind = <K extends EdgeKind>(
  diagram: Diagram,
  kind: K,
): readonly Extract<ERLink, { kind: K }>[] =>
  diagram.edgeOrder
    .map((id) => diagram.edgesById[id])
    .filter((e): e is Extract<ERLink, { kind: K }> => !!e && e.kind === kind)

export const hasPath = (diagram: Diagram, from: NodeId, to: NodeId): boolean => {
  if (from === to) return true
  const visited = new Set<NodeId>([from])
  const queue: NodeId[] = [from]
  while (queue.length > 0) {
    const current = queue.shift()!
    for (const n of neighbors(diagram, current)) {
      if (n === to) return true
      if (!visited.has(n)) {
        visited.add(n)
        queue.push(n)
      }
    }
  }
  return false
}

// Type guards (keep with graph since predicates are filter-helpers)
export const isEntityNode = (n: ERNode): n is EntityNode => n.kind === 'entity'
export const isRelationshipNode = (n: ERNode): n is RelationshipNode => n.kind === 'relationship'
export const isAttributeNode = (n: ERNode): n is AttributeNode => n.kind === 'attribute'
export const isIsaNode = (n: ERNode): n is ISANode => n.kind === 'isa'

export const isEntityRelationshipEdge = (e: ERLink): e is EntityRelationshipEdge =>
  e.kind === 'entity-relationship'
export const isAttributeEdge = (e: ERLink): e is AttributeEdge => e.kind === 'attribute-of'
export const isIsaEdge = (e: ERLink): e is ISAEdge => e.kind === 'isa-link'
```

- [ ] **Step 4: Run tests**

Run: `pnpm test -- src/domain/graph.test.ts`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/domain/graph.ts src/domain/graph.test.ts
git commit -F /tmp/phase1-task4-msg.txt
```

`/tmp/phase1-task4-msg.txt`:

```
feat(domain): add graph ops + type guards

incidentEdges, neighbors with edge-kind filter, nodesByKind,
edgesByKind, hasPath (BFS), and discriminated-union guards
(isEntityNode, isAttributeEdge, etc.) for downstream filters.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

---

## Task 5: Notation Types + Invariants

**Files:**
- Create: `src/notation/types.ts` (ValidationRule, ValidationError, InvariantViolation; NotationPlugin interface arrives in Phase 4)
- Create: `src/domain/invariants.ts`
- Create: `src/domain/invariants.test.ts`

- [ ] **Step 1: Write notation-level types**

Create `src/notation/types.ts`:

```ts
import type { Diagram, NodeId, EdgeId } from '@/domain/types'

export type ValidationSeverity = 'error' | 'warning'

export type ValidationCategory =
  | 'entity'
  | 'relationship'
  | 'attribute'
  | 'generalization'
  | 'structural'

export interface ValidationError {
  readonly ruleId: string
  readonly severity: ValidationSeverity
  readonly targetId: NodeId | EdgeId
  readonly messageKey: string
  readonly messageParams?: Readonly<Record<string, string>>
}

export interface ValidationRule {
  readonly id: string
  readonly severity: ValidationSeverity
  readonly category: ValidationCategory
  readonly check: (diagram: Diagram) => readonly ValidationError[]
}

// Invariants are stricter than rules — they describe malformed state that
// should never exist at runtime. Violations are dev-mode assertions.
export interface InvariantViolation {
  readonly invariantId: string
  readonly targetId: NodeId | EdgeId
  readonly detail: string
}
```

- [ ] **Step 2: Write the failing invariants test**

Create `src/domain/invariants.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { checkInvariants } from './invariants'
import { asNodeId, asEdgeId } from './id'
import { emptyDiagram } from './types'
import type {
  Diagram, EntityNode, AttributeNode, RelationshipNode, ISANode,
  EntityRelationshipEdge, AttributeEdge, ISAEdge,
} from './types'

const nid = (v: string) => asNodeId(v.padEnd(10, '0').slice(0, 10))
const eid = (v: string) => asEdgeId(v.padEnd(10, '0').slice(0, 10))

const entity = (id: string, overrides: Partial<EntityNode> = {}): EntityNode => ({
  id: nid(id), kind: 'entity', name: id, isWeak: false,
  position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
  ...overrides,
})
const rel = (id: string, overrides: Partial<RelationshipNode> = {}): RelationshipNode => ({
  id: nid(id), kind: 'relationship', name: id, isIdentifying: false,
  position: { x: 0, y: 0 }, size: { width: 140, height: 70 },
  ...overrides,
})
const attr = (id: string, overrides: Partial<AttributeNode> = {}): AttributeNode => ({
  id: nid(id), kind: 'attribute', name: id,
  isKey: false, isDiscriminant: false, isMultivalued: false, isDerived: false, isComposite: false,
  position: { x: 0, y: 0 }, size: { width: 90, height: 50 },
  ...overrides,
})
const isa = (id: string): ISANode => ({
  id: nid(id), kind: 'isa', isTotal: false,
  position: { x: 0, y: 0 }, size: { width: 100, height: 60 },
})

const erEdge = (
  id: string, src: string, tgt: string, o: Partial<EntityRelationshipEdge> = {},
): EntityRelationshipEdge => ({
  id: eid(id), kind: 'entity-relationship',
  sourceId: nid(src), targetId: nid(tgt),
  cardinality: '1', participation: 'partial', waypoints: [], ...o,
})
const attrE = (id: string, src: string, tgt: string): AttributeEdge => ({
  id: eid(id), kind: 'attribute-of', sourceId: nid(src), targetId: nid(tgt), waypoints: [],
})
const isaE = (
  id: string, src: string, tgt: string, role: 'parent' | 'child',
): ISAEdge => ({
  id: eid(id), kind: 'isa-link', sourceId: nid(src), targetId: nid(tgt), role, waypoints: [],
})

const make = (
  nodes: readonly (EntityNode | RelationshipNode | AttributeNode | ISANode)[],
  edges: readonly (EntityRelationshipEdge | AttributeEdge | ISAEdge)[],
): Diagram => {
  const d = emptyDiagram()
  return {
    ...d,
    nodesById: Object.fromEntries(nodes.map((n) => [n.id, n])) as Diagram['nodesById'],
    edgesById: Object.fromEntries(edges.map((e) => [e.id, e])) as Diagram['edgesById'],
    nodeOrder: nodes.map((n) => n.id),
    edgeOrder: edges.map((e) => e.id),
  }
}

describe('invariant 1: every edge references existing nodes', () => {
  it('passes for a clean diagram', () => {
    const d = make([entity('e1'), rel('r1')], [erEdge('x1', 'e1', 'r1')])
    expect(checkInvariants(d).filter((v) => v.invariantId === 'INV-1')).toEqual([])
  })
  it('fires when an edge references a missing node', () => {
    const d = make([entity('e1')], [erEdge('x1', 'e1', 'missing__')])
    const v = checkInvariants(d).filter((x) => x.invariantId === 'INV-1')
    expect(v).toHaveLength(1)
  })
})

describe('invariant 2: attribute has exactly one outbound AttributeEdge', () => {
  it('passes when exactly one outbound', () => {
    const d = make(
      [entity('e1'), attr('a1')],
      [attrE('x1', 'a1', 'e1')],
    )
    expect(checkInvariants(d).filter((v) => v.invariantId === 'INV-2')).toEqual([])
  })
  it('fires when attribute has zero outbound attribute-of edges', () => {
    const d = make([entity('e1'), attr('a1')], [])
    const v = checkInvariants(d).filter((x) => x.invariantId === 'INV-2')
    expect(v).toHaveLength(1)
  })
  it('fires when attribute has multiple outbound attribute-of edges', () => {
    const d = make(
      [entity('e1'), entity('e2'), attr('a1')],
      [attrE('x1', 'a1', 'e1'), attrE('x2', 'a1', 'e2')],
    )
    const v = checkInvariants(d).filter((x) => x.invariantId === 'INV-2')
    expect(v).toHaveLength(1)
  })
})

describe('invariant 3: AttributeEdge targets Entity|Relationship|composite-Attribute', () => {
  it('passes for entity target', () => {
    const d = make([entity('e1'), attr('a1')], [attrE('x1', 'a1', 'e1')])
    expect(checkInvariants(d).filter((v) => v.invariantId === 'INV-3')).toEqual([])
  })
  it('passes for composite-attribute target', () => {
    const d = make(
      [attr('parentA', { isComposite: true }), attr('child__A')],
      [attrE('x1', 'child__A', 'parentA')],
    )
    expect(checkInvariants(d).filter((v) => v.invariantId === 'INV-3')).toEqual([])
  })
  it('fires for non-composite attribute target', () => {
    const d = make(
      [attr('parentA'), attr('child__A')],
      [attrE('x1', 'child__A', 'parentA')],
    )
    const v = checkInvariants(d).filter((x) => x.invariantId === 'INV-3')
    expect(v).toHaveLength(1)
  })
})

describe('invariant 4: isDiscriminant ⇒ parent is weak entity', () => {
  it('passes for discriminant on weak entity', () => {
    const d = make(
      [entity('e1', { isWeak: true }), attr('a1', { isDiscriminant: true })],
      [attrE('x1', 'a1', 'e1')],
    )
    expect(checkInvariants(d).filter((v) => v.invariantId === 'INV-4')).toEqual([])
  })
  it('fires when discriminant on strong entity', () => {
    const d = make(
      [entity('e1'), attr('a1', { isDiscriminant: true })],
      [attrE('x1', 'a1', 'e1')],
    )
    const v = checkInvariants(d).filter((x) => x.invariantId === 'INV-4')
    expect(v).toHaveLength(1)
  })
})

describe('invariant 5: Relationship has ≥2 EntityRelationshipEdges', () => {
  it('passes with 2 ER edges', () => {
    const d = make(
      [entity('e1'), entity('e2'), rel('r1')],
      [erEdge('x1', 'e1', 'r1'), erEdge('x2', 'e2', 'r1')],
    )
    expect(checkInvariants(d).filter((v) => v.invariantId === 'INV-5')).toEqual([])
  })
  it('fires with 1 ER edge', () => {
    const d = make(
      [entity('e1'), rel('r1')],
      [erEdge('x1', 'e1', 'r1')],
    )
    const v = checkInvariants(d).filter((x) => x.invariantId === 'INV-5')
    expect(v).toHaveLength(1)
  })
})

describe('invariant 6: ISA has exactly 1 parent + ≥1 child', () => {
  it('passes with 1 parent + 2 children', () => {
    const d = make(
      [entity('p1'), entity('c1'), entity('c2'), isa('i1')],
      [
        isaE('x1', 'p1', 'i1', 'parent'),
        isaE('x2', 'i1', 'c1', 'child'),
        isaE('x3', 'i1', 'c2', 'child'),
      ],
    )
    expect(checkInvariants(d).filter((v) => v.invariantId === 'INV-6')).toEqual([])
  })
  it('fires with no parent edges', () => {
    const d = make(
      [entity('c1'), isa('i1')],
      [isaE('x2', 'i1', 'c1', 'child')],
    )
    const v = checkInvariants(d).filter((x) => x.invariantId === 'INV-6')
    expect(v).toHaveLength(1)
  })
  it('fires with no child edges', () => {
    const d = make(
      [entity('p1'), isa('i1')],
      [isaE('x1', 'p1', 'i1', 'parent')],
    )
    const v = checkInvariants(d).filter((x) => x.invariantId === 'INV-6')
    expect(v).toHaveLength(1)
  })
})

describe('invariant 7: no ID collisions between nodes and edges', () => {
  it('passes with disjoint id spaces', () => {
    const d = make([entity('e1')], [])
    expect(checkInvariants(d).filter((v) => v.invariantId === 'INV-7')).toEqual([])
  })
  it('fires when a node id is also an edge id', () => {
    const d = make([entity('e1')], [erEdge('e1', 'e1', 'e1')])
    const v = checkInvariants(d).filter((x) => x.invariantId === 'INV-7')
    expect(v.length).toBeGreaterThanOrEqual(1)
  })
})

describe('invariant 8: nodeOrder/edgeOrder are permutations of keys', () => {
  it('passes when matching', () => {
    const d = make([entity('e1')], [])
    expect(checkInvariants(d).filter((v) => v.invariantId === 'INV-8')).toEqual([])
  })
  it('fires when nodeOrder misses an id', () => {
    const base = make([entity('e1'), entity('e2')], [])
    const d: Diagram = { ...base, nodeOrder: [base.nodeOrder[0]!] }
    const v = checkInvariants(d).filter((x) => x.invariantId === 'INV-8')
    expect(v).toHaveLength(1)
  })
})

describe('invariant 9: recursive ER edges have distinct non-empty roles', () => {
  it('passes when both roles present and distinct', () => {
    const d = make(
      [entity('e1'), rel('r1')],
      [
        erEdge('x1', 'e1', 'r1', { role: 'teacher' }),
        erEdge('x2', 'e1', 'r1', { role: 'student' }),
      ],
    )
    expect(checkInvariants(d).filter((v) => v.invariantId === 'INV-9')).toEqual([])
  })
  it('fires when roles are missing on recursive edges', () => {
    const d = make(
      [entity('e1'), rel('r1')],
      [erEdge('x1', 'e1', 'r1'), erEdge('x2', 'e1', 'r1')],
    )
    const v = checkInvariants(d).filter((x) => x.invariantId === 'INV-9')
    expect(v.length).toBeGreaterThanOrEqual(1)
  })
  it('fires when roles are equal on recursive edges', () => {
    const d = make(
      [entity('e1'), rel('r1')],
      [
        erEdge('x1', 'e1', 'r1', { role: 'same' }),
        erEdge('x2', 'e1', 'r1', { role: 'same' }),
      ],
    )
    const v = checkInvariants(d).filter((x) => x.invariantId === 'INV-9')
    expect(v.length).toBeGreaterThanOrEqual(1)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test -- src/domain/invariants.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Write the implementation**

Create `src/domain/invariants.ts`:

```ts
import type { InvariantViolation } from '@/notation/types'
import type { Diagram, NodeId } from './types'
import { incidentEdges, isAttributeEdge, isAttributeNode, isEntityNode, isEntityRelationshipEdge, isIsaEdge, isIsaNode, isRelationshipNode } from './graph'

export const checkInvariants = (diagram: Diagram): readonly InvariantViolation[] => {
  const out: InvariantViolation[] = []

  // INV-1: every edge references existing nodes.
  for (const edgeId of diagram.edgeOrder) {
    const edge = diagram.edgesById[edgeId]
    if (!edge) continue
    if (!diagram.nodesById[edge.sourceId]) {
      out.push({ invariantId: 'INV-1', targetId: edge.id, detail: `dangling sourceId ${edge.sourceId}` })
    }
    if (!diagram.nodesById[edge.targetId]) {
      out.push({ invariantId: 'INV-1', targetId: edge.id, detail: `dangling targetId ${edge.targetId}` })
    }
  }

  // INV-2 + INV-3: attribute outbound parentage.
  for (const nodeId of diagram.nodeOrder) {
    const node = diagram.nodesById[nodeId]
    if (!node || !isAttributeNode(node)) continue

    const outbound = incidentEdges(diagram, node.id)
      .filter(isAttributeEdge)
      .filter((e) => e.sourceId === node.id)

    if (outbound.length !== 1) {
      out.push({
        invariantId: 'INV-2',
        targetId: node.id,
        detail: `attribute has ${outbound.length} outbound attribute-of edges (expected 1)`,
      })
    }

    for (const edge of outbound) {
      const parent = diagram.nodesById[edge.targetId]
      if (!parent) continue
      const legal = isEntityNode(parent) || isRelationshipNode(parent) || (isAttributeNode(parent) && parent.isComposite)
      if (!legal) {
        out.push({
          invariantId: 'INV-3',
          targetId: edge.id,
          detail: `attribute-of target ${parent.id} is ${parent.kind}${isAttributeNode(parent) ? ' (not composite)' : ''}`,
        })
      }
    }

    // INV-4: discriminant ⇒ parent is weak entity.
    if (node.isDiscriminant && outbound.length === 1) {
      const parent = diagram.nodesById[outbound[0]!.targetId]
      if (parent && (!isEntityNode(parent) || !parent.isWeak)) {
        out.push({
          invariantId: 'INV-4',
          targetId: node.id,
          detail: 'discriminant must attach to a weak entity',
        })
      }
    }
  }

  // INV-5: relationship has ≥2 EntityRelationshipEdges (except when isolated / being drawn — we fire here; runtime path that creates an isolated rel sets this up intentionally and callers filter).
  for (const nodeId of diagram.nodeOrder) {
    const node = diagram.nodesById[nodeId]
    if (!node || !isRelationshipNode(node)) continue
    const erCount = incidentEdges(diagram, node.id).filter(isEntityRelationshipEdge).length
    if (erCount < 2) {
      out.push({
        invariantId: 'INV-5',
        targetId: node.id,
        detail: `relationship has ${erCount} entity-relationship edges (need ≥2)`,
      })
    }
  }

  // INV-6: ISA has exactly one parent ISAEdge + ≥1 child ISAEdge.
  for (const nodeId of diagram.nodeOrder) {
    const node = diagram.nodesById[nodeId]
    if (!node || !isIsaNode(node)) continue
    const isaEdges = incidentEdges(diagram, node.id).filter(isIsaEdge)
    const parents = isaEdges.filter((e) => e.role === 'parent' && e.targetId === node.id)
    const children = isaEdges.filter((e) => e.role === 'child' && e.sourceId === node.id)
    if (parents.length !== 1) {
      out.push({ invariantId: 'INV-6', targetId: node.id, detail: `isa has ${parents.length} parent edges (expected 1)` })
    }
    if (children.length < 1) {
      out.push({ invariantId: 'INV-6', targetId: node.id, detail: `isa has ${children.length} child edges (need ≥1)` })
    }
  }

  // INV-7: no ID collision between nodes and edges.
  const nodeIds = new Set(Object.keys(diagram.nodesById))
  for (const edgeId of Object.keys(diagram.edgesById)) {
    if (nodeIds.has(edgeId)) {
      out.push({ invariantId: 'INV-7', targetId: edgeId as NodeId, detail: `id collision between node and edge: ${edgeId}` })
    }
  }

  // INV-8: nodeOrder / edgeOrder permutations of key sets.
  if (!setsEqual(new Set(diagram.nodeOrder), new Set(Object.keys(diagram.nodesById)))) {
    out.push({ invariantId: 'INV-8', targetId: '' as NodeId, detail: 'nodeOrder is not a permutation of nodesById keys' })
  }
  if (!setsEqual(new Set(diagram.edgeOrder), new Set(Object.keys(diagram.edgesById)))) {
    out.push({ invariantId: 'INV-8', targetId: '' as NodeId, detail: 'edgeOrder is not a permutation of edgesById keys' })
  }

  // INV-9: recursive ER edges (same entity on both ends of same relationship) require distinct non-empty roles.
  for (const nodeId of diagram.nodeOrder) {
    const node = diagram.nodesById[nodeId]
    if (!node || !isRelationshipNode(node)) continue
    const ers = incidentEdges(diagram, node.id).filter(isEntityRelationshipEdge)

    // Group edges by the "other" entity id; a group ≥2 means recursive.
    const groups = new Map<NodeId, typeof ers[number][]>()
    for (const e of ers) {
      const other = (e.sourceId === node.id ? e.targetId : e.sourceId)
      const list = groups.get(other) ?? []
      list.push(e)
      groups.set(other, list)
    }
    for (const [, edges] of groups) {
      if (edges.length < 2) continue
      const roles = edges.map((e) => (e.role ?? '').trim())
      const allNonEmpty = roles.every((r) => r.length > 0)
      const allDistinct = new Set(roles).size === roles.length
      if (!allNonEmpty || !allDistinct) {
        for (const e of edges) {
          out.push({ invariantId: 'INV-9', targetId: e.id, detail: 'recursive edges need distinct non-empty roles' })
        }
      }
    }
  }

  return out
}

const setsEqual = <T>(a: Set<T>, b: Set<T>): boolean => {
  if (a.size !== b.size) return false
  for (const v of a) if (!b.has(v)) return false
  return true
}
```

- [ ] **Step 5: Run tests + typecheck**

Run: `pnpm test -- src/domain/invariants.test.ts`
Expected: all tests pass.

Run: `pnpm typecheck`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/notation/types.ts src/domain/invariants.ts src/domain/invariants.test.ts
git commit -F /tmp/phase1-task5-msg.txt
```

`/tmp/phase1-task5-msg.txt`:

```
feat(domain,notation): add invariants + ValidationRule/Error types

src/notation/types.ts declares ValidationRule, ValidationError,
InvariantViolation for downstream rule + plugin wiring.
src/domain/invariants.ts implements the 9 structural invariants
from spec §3.7 as pure predicates.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

---

## Task 6: Test Fixture Factories + @fixtures alias

**Files:**
- Create: `tests/fixtures/diagrams/empty.ts`
- Create: `tests/fixtures/diagrams/makeNode.ts`
- Create: `tests/fixtures/diagrams/makeEdge.ts`
- Create: `tests/fixtures/diagrams/makeDiagram.ts`
- Create: `tests/fixtures/diagrams/composed.ts`
- Modify: `vitest.config.ts` (add `@fixtures` alias + `tests/fixtures/**` include path for ts compilation)
- Modify: `tsconfig.app.json` + `tsconfig.json` paths (for type-check + IDE)

- [ ] **Step 1: Add the `@fixtures` path alias**

Edit `vitest.config.ts` — replace the `resolve.alias` block:

```ts
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
    '@fixtures': path.resolve(__dirname, './tests/fixtures'),
  },
},
```

Edit `tsconfig.json` to extend `paths`:

Run: `cat tsconfig.json`
Inspect the compilerOptions. Add (or create if missing):

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@fixtures/*": ["tests/fixtures/*"]
    }
  }
}
```

If `tsconfig.json` is a project-references shell, apply the same `paths` in the appropriate `tsconfig.app.json` (or whichever file sets `compilerOptions` for `src/`).

- [ ] **Step 2: Write the fixture factories**

Create `tests/fixtures/diagrams/empty.ts`:

```ts
import { emptyDiagram } from '@/domain/types'

export { emptyDiagram }
```

Create `tests/fixtures/diagrams/makeNode.ts`:

```ts
import { asNodeId, ID_LENGTH } from '@/domain/id'
import type {
  EntityNode, RelationshipNode, AttributeNode, ISANode, NodeId,
} from '@/domain/types'

let counter = 0
const nextId = (prefix: string): NodeId =>
  asNodeId(`${prefix}${String(++counter).padStart(ID_LENGTH - prefix.length, '0')}`.slice(0, ID_LENGTH))

export const resetIdCounter = (): void => { counter = 0 }

export const makeEntity = (overrides: Partial<EntityNode> = {}): EntityNode => ({
  id: nextId('e'),
  kind: 'entity',
  name: 'Entity',
  isWeak: false,
  position: { x: 0, y: 0 },
  size: { width: 120, height: 60 },
  ...overrides,
})

export const makeRelationship = (overrides: Partial<RelationshipNode> = {}): RelationshipNode => ({
  id: nextId('r'),
  kind: 'relationship',
  name: 'Rel',
  isIdentifying: false,
  position: { x: 0, y: 0 },
  size: { width: 140, height: 70 },
  ...overrides,
})

export const makeAttribute = (overrides: Partial<AttributeNode> = {}): AttributeNode => ({
  id: nextId('a'),
  kind: 'attribute',
  name: 'attr',
  isKey: false,
  isDiscriminant: false,
  isMultivalued: false,
  isDerived: false,
  isComposite: false,
  position: { x: 0, y: 0 },
  size: { width: 90, height: 50 },
  ...overrides,
})

export const makeIsa = (overrides: Partial<ISANode> = {}): ISANode => ({
  id: nextId('i'),
  kind: 'isa',
  isTotal: false,
  position: { x: 0, y: 0 },
  size: { width: 100, height: 60 },
  ...overrides,
})
```

Create `tests/fixtures/diagrams/makeEdge.ts`:

```ts
import { asEdgeId, ID_LENGTH } from '@/domain/id'
import type {
  EntityRelationshipEdge, AttributeEdge, ISAEdge, EdgeId, NodeId,
} from '@/domain/types'

let counter = 0
const nextId = (): EdgeId => asEdgeId(`x${String(++counter).padStart(ID_LENGTH - 1, '0')}`)

export const resetEdgeIdCounter = (): void => { counter = 0 }

export const makeEREdge = (
  source: NodeId, target: NodeId, overrides: Partial<EntityRelationshipEdge> = {},
): EntityRelationshipEdge => ({
  id: nextId(),
  kind: 'entity-relationship',
  sourceId: source,
  targetId: target,
  cardinality: '1',
  participation: 'partial',
  waypoints: [],
  ...overrides,
})

export const makeAttrEdge = (
  source: NodeId, target: NodeId,
): AttributeEdge => ({
  id: nextId(),
  kind: 'attribute-of',
  sourceId: source,
  targetId: target,
  waypoints: [],
})

export const makeIsaEdge = (
  source: NodeId, target: NodeId, role: 'parent' | 'child',
): ISAEdge => ({
  id: nextId(),
  kind: 'isa-link',
  sourceId: source,
  targetId: target,
  role,
  waypoints: [],
})
```

Create `tests/fixtures/diagrams/makeDiagram.ts`:

```ts
import type { Diagram, ERNode, ERLink } from '@/domain/types'

export const makeDiagram = (
  nodes: readonly ERNode[] = [],
  edges: readonly ERLink[] = [],
): Diagram => ({
  schemaVersion: 1,
  nodesById: Object.fromEntries(nodes.map((n) => [n.id, n])) as Diagram['nodesById'],
  edgesById: Object.fromEntries(edges.map((e) => [e.id, e])) as Diagram['edgesById'],
  nodeOrder: nodes.map((n) => n.id),
  edgeOrder: edges.map((e) => e.id),
})
```

Create `tests/fixtures/diagrams/composed.ts`:

```ts
import { makeEntity, makeRelationship, makeAttribute, makeIsa } from './makeNode'
import { makeEREdge, makeAttrEdge, makeIsaEdge } from './makeEdge'
import { makeDiagram } from './makeDiagram'
import type { Diagram } from '@/domain/types'

// Student with a key attribute `id`.
export const strongEntityWithKey = (): Diagram => {
  const student = makeEntity({ name: 'Student' })
  const id = makeAttribute({ name: 'id', isKey: true })
  return makeDiagram([student, id], [makeAttrEdge(id.id, student.id)])
}

// Room (weak) depending on Building via Located identifying rel;
// Room has discriminant `number`.
export const weakEntityWithDiscriminant = (): Diagram => {
  const building = makeEntity({ name: 'Building' })
  const bldgId = makeAttribute({ name: 'code', isKey: true })
  const room = makeEntity({ name: 'Room', isWeak: true })
  const roomNum = makeAttribute({ name: 'number', isDiscriminant: true })
  const located = makeRelationship({ name: 'Located', isIdentifying: true })
  return makeDiagram(
    [building, bldgId, room, roomNum, located],
    [
      makeAttrEdge(bldgId.id, building.id),
      makeAttrEdge(roomNum.id, room.id),
      makeEREdge(building.id, located.id, { cardinality: '1', participation: 'partial' }),
      makeEREdge(room.id, located.id, { cardinality: 'N', participation: 'total' }),
    ],
  )
}

// Project involves Employee, Department, Task — 3-way n-ary.
export const naryRelationship = (): Diagram => {
  const emp = makeEntity({ name: 'Employee' })
  const dept = makeEntity({ name: 'Department' })
  const task = makeEntity({ name: 'Task' })
  const assign = makeRelationship({ name: 'Assign' })
  return makeDiagram(
    [emp, dept, task, assign],
    [
      makeEREdge(emp.id, assign.id),
      makeEREdge(dept.id, assign.id),
      makeEREdge(task.id, assign.id),
    ],
  )
}

// Employee Supervises Employee — recursive.
export const recursiveRelationship = (): Diagram => {
  const emp = makeEntity({ name: 'Employee' })
  const empId = makeAttribute({ name: 'id', isKey: true })
  const supervises = makeRelationship({ name: 'Supervises' })
  return makeDiagram(
    [emp, empId, supervises],
    [
      makeAttrEdge(empId.id, emp.id),
      makeEREdge(emp.id, supervises.id, { role: 'supervisor' }),
      makeEREdge(emp.id, supervises.id, { role: 'subordinate' }),
    ],
  )
}

// Person ISA {Student, Employee}.
export const isaHierarchy = (): Diagram => {
  const person = makeEntity({ name: 'Person' })
  const personId = makeAttribute({ name: 'ssn', isKey: true })
  const student = makeEntity({ name: 'Student' })
  const employee = makeEntity({ name: 'Employee' })
  const i = makeIsa()
  return makeDiagram(
    [person, personId, student, employee, i],
    [
      makeAttrEdge(personId.id, person.id),
      makeIsaEdge(person.id, i.id, 'parent'),
      makeIsaEdge(i.id, student.id, 'child'),
      makeIsaEdge(i.id, employee.id, 'child'),
    ],
  )
}

// Address (composite) = {street, city}.
export const compositeAttribute = (): Diagram => {
  const person = makeEntity({ name: 'Person' })
  const personId = makeAttribute({ name: 'id', isKey: true })
  const address = makeAttribute({ name: 'address', isComposite: true })
  const street = makeAttribute({ name: 'street' })
  const city = makeAttribute({ name: 'city' })
  return makeDiagram(
    [person, personId, address, street, city],
    [
      makeAttrEdge(personId.id, person.id),
      makeAttrEdge(address.id, person.id),
      makeAttrEdge(street.id, address.id),
      makeAttrEdge(city.id, address.id),
    ],
  )
}
```

- [ ] **Step 3: Sanity-check fixtures compile and load**

Run: `pnpm typecheck`
Expected: clean.

- [ ] **Step 4: Write a smoke test for the fixtures**

Create `tests/fixtures/diagrams/composed.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  strongEntityWithKey,
  weakEntityWithDiscriminant,
  naryRelationship,
  recursiveRelationship,
  isaHierarchy,
  compositeAttribute,
} from './composed'
import { checkInvariants } from '@/domain/invariants'

describe('composed fixtures', () => {
  it('strongEntityWithKey satisfies invariants', () => {
    expect(checkInvariants(strongEntityWithKey())).toEqual([])
  })
  it('weakEntityWithDiscriminant satisfies invariants', () => {
    expect(checkInvariants(weakEntityWithDiscriminant())).toEqual([])
  })
  it('naryRelationship satisfies invariants', () => {
    expect(checkInvariants(naryRelationship())).toEqual([])
  })
  it('recursiveRelationship satisfies invariants', () => {
    expect(checkInvariants(recursiveRelationship())).toEqual([])
  })
  it('isaHierarchy satisfies invariants', () => {
    expect(checkInvariants(isaHierarchy())).toEqual([])
  })
  it('compositeAttribute satisfies invariants', () => {
    expect(checkInvariants(compositeAttribute())).toEqual([])
  })
})
```

Update `vitest.config.ts` `test.include`:

```ts
include: ['src/**/*.{test,spec}.{ts,tsx}', 'tests/fixtures/**/*.test.{ts,tsx}'],
```

- [ ] **Step 5: Run tests**

Run: `pnpm test`
Expected: all prior tests + 6 new fixture tests pass.

- [ ] **Step 6: Commit**

```bash
git add tests/fixtures/diagrams/ vitest.config.ts tsconfig.json tsconfig.app.json
git commit -F /tmp/phase1-task6-msg.txt
```

`/tmp/phase1-task6-msg.txt`:

```
test: add diagram fixture factories + @fixtures alias

makeEntity/Relationship/Attribute/Isa factories, edge builders,
and six composed fixtures (strong-with-key, weak-with-discriminant,
n-ary, recursive, isa, composite). All satisfy invariants.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

---

## Task 7: i18n Locale Bundles

**Files:**
- Create: `src/platform/i18n/locales/en/validation.json`
- Create: `src/platform/i18n/locales/it/validation.json`

- [ ] **Step 1: Write the English bundle**

Create `src/platform/i18n/locales/en/validation.json`:

```json
{
  "validation": {
    "chen": {
      "entity": {
        "must-have-key": "Strong entity must have at least one key attribute.",
        "weak-missing-discriminant": "Weak entity must have a discriminant attribute.",
        "must-have-attribute": "Entity must have at least one attribute.",
        "weak-total-participation": "Weak entity must have total participation in the identifying relationship.",
        "weak-not-on-1-side": "Weak entity cannot be on the 1-side of the identifying relationship (must be N-side).",
        "weak-single-identifying": "Weak entity must connect to exactly one identifying relationship (currently {{count}}).",
        "name-unique": "Entity name \"{{name}}\" is already used by another entity.",
        "name-non-empty": "Entity name must not be empty.",
        "orphan-warning": "Entity has no relationships (may be incomplete).",
        "weak-no-key": "Weak entity must not have a key attribute; use a discriminant (partial key) instead."
      },
      "relationship": {
        "min-two-entities": "Relationship must connect at least 2 entities (or be a recursive relationship).",
        "cardinality-required": "All connections on this relationship must have cardinality defined.",
        "participation-required": "All connections on this relationship must have participation defined.",
        "identifying-needs-weak": "Identifying relationship must connect at least one weak entity.",
        "non-identifying-not-weak": "Non-identifying relationship should not be marked as identifying.",
        "name-unique": "Relationship name \"{{name}}\" is already used by another relationship.",
        "recursive-roles-distinct": "Recursive relationship must have distinct, non-empty roles on both edges."
      },
      "attribute": {
        "single-parent": "Attribute must connect to exactly one parent (entity, relationship, or composite attribute).",
        "no-dual-parent": "Attribute cannot connect to both an entity and a relationship.",
        "discriminant-weak-only": "Discriminant is only valid on attributes of a weak entity.",
        "not-key-and-derived": "Attribute cannot be both key and derived.",
        "key-not-multivalued": "Key attribute cannot be multivalued.",
        "discriminant-not-multivalued": "Discriminant cannot be multivalued.",
        "relationship-not-key": "Attributes of a relationship cannot be key attributes.",
        "name-unique": "Attribute name \"{{name}}\" is already used by another attribute on the same parent.",
        "composite-needs-sub": "Composite attribute should have at least one sub-attribute.",
        "sub-not-key": "Sub-attribute cannot be a key attribute.",
        "sub-not-discriminant": "Sub-attribute cannot be a discriminant.",
        "sub-not-composite": "Sub-attribute cannot itself be composite (only one level of nesting)."
      },
      "generalization": {
        "parent-exists": "ISA generalization must have a parent entity.",
        "has-children": "ISA generalization must have at least one child.",
        "single-child-warning": "ISA with a single child is semantically weak — consider whether specialization is meaningful."
      },
      "structural": {
        "dangling-edge": "Edge references a node that does not exist."
      }
    }
  }
}
```

- [ ] **Step 2: Write the Italian stub**

Create `src/platform/i18n/locales/it/validation.json` (English fallback values; Phase 7 translates):

```json
{
  "validation": {
    "chen": {
      "entity": {
        "must-have-key": "Strong entity must have at least one key attribute.",
        "weak-missing-discriminant": "Weak entity must have a discriminant attribute.",
        "must-have-attribute": "Entity must have at least one attribute.",
        "weak-total-participation": "Weak entity must have total participation in the identifying relationship.",
        "weak-not-on-1-side": "Weak entity cannot be on the 1-side of the identifying relationship (must be N-side).",
        "weak-single-identifying": "Weak entity must connect to exactly one identifying relationship (currently {{count}}).",
        "name-unique": "Entity name \"{{name}}\" is already used by another entity.",
        "name-non-empty": "Entity name must not be empty.",
        "orphan-warning": "Entity has no relationships (may be incomplete).",
        "weak-no-key": "Weak entity must not have a key attribute; use a discriminant (partial key) instead."
      },
      "relationship": {
        "min-two-entities": "Relationship must connect at least 2 entities (or be a recursive relationship).",
        "cardinality-required": "All connections on this relationship must have cardinality defined.",
        "participation-required": "All connections on this relationship must have participation defined.",
        "identifying-needs-weak": "Identifying relationship must connect at least one weak entity.",
        "non-identifying-not-weak": "Non-identifying relationship should not be marked as identifying.",
        "name-unique": "Relationship name \"{{name}}\" is already used by another relationship.",
        "recursive-roles-distinct": "Recursive relationship must have distinct, non-empty roles on both edges."
      },
      "attribute": {
        "single-parent": "Attribute must connect to exactly one parent (entity, relationship, or composite attribute).",
        "no-dual-parent": "Attribute cannot connect to both an entity and a relationship.",
        "discriminant-weak-only": "Discriminant is only valid on attributes of a weak entity.",
        "not-key-and-derived": "Attribute cannot be both key and derived.",
        "key-not-multivalued": "Key attribute cannot be multivalued.",
        "discriminant-not-multivalued": "Discriminant cannot be multivalued.",
        "relationship-not-key": "Attributes of a relationship cannot be key attributes.",
        "name-unique": "Attribute name \"{{name}}\" is already used by another attribute on the same parent.",
        "composite-needs-sub": "Composite attribute should have at least one sub-attribute.",
        "sub-not-key": "Sub-attribute cannot be a key attribute.",
        "sub-not-discriminant": "Sub-attribute cannot be a discriminant.",
        "sub-not-composite": "Sub-attribute cannot itself be composite (only one level of nesting)."
      },
      "generalization": {
        "parent-exists": "ISA generalization must have a parent entity.",
        "has-children": "ISA generalization must have at least one child.",
        "single-child-warning": "ISA with a single child is semantically weak — consider whether specialization is meaningful."
      },
      "structural": {
        "dangling-edge": "Edge references a node that does not exist."
      }
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/platform/i18n/locales
git commit -F /tmp/phase1-task7-msg.txt
```

`/tmp/phase1-task7-msg.txt`:

```
feat(platform): add EN + IT validation locale bundles

33 Chen-notation validation message keys across entity,
relationship, attribute, generalization, structural categories.
IT bundle mirrors EN for now; Phase 7 replaces with translations.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

---

## Task 8: Entity Rules (10)

**Files:**
- Create: `src/notation/chen/rules/entity.ts`
- Create: `src/notation/chen/rules/entity.test.ts`

Rule ids (stable — referenced in tests and i18n keys):

| ID | Message key | Severity | Summary |
|---|---|---|---|
| `chen.entity.must-have-key` | `validation.chen.entity.must-have-key` | error | Strong entity needs ≥1 key attribute (ISA child exempt). |
| `chen.entity.weak-missing-discriminant` | `validation.chen.entity.weak-missing-discriminant` | error | Weak entity needs a discriminant. |
| `chen.entity.must-have-attribute` | `validation.chen.entity.must-have-attribute` | error | Entity needs ≥1 attribute (ISA child exempt). |
| `chen.entity.weak-total-participation` | `validation.chen.entity.weak-total-participation` | error | Weak ⇒ total participation in identifying rel. |
| `chen.entity.weak-not-on-1-side` | `validation.chen.entity.weak-not-on-1-side` | error | Weak must be on N-side of identifying rel. |
| `chen.entity.weak-single-identifying` | `validation.chen.entity.weak-single-identifying` | error | Weak must connect to exactly 1 identifying rel. |
| `chen.entity.name-unique` | `validation.chen.entity.name-unique` | error | Entity names unique (case-insensitive). |
| `chen.entity.name-non-empty` | `validation.chen.entity.name-non-empty` | error | Entity name must be non-empty. |
| `chen.entity.orphan-warning` | `validation.chen.entity.orphan-warning` | warning | Entity with no relationships. |
| `chen.entity.weak-no-key` | `validation.chen.entity.weak-no-key` | error | Weak entity may not have a key attribute. |

- [ ] **Step 1: Write the failing tests**

Create `src/notation/chen/rules/entity.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  entityMustHaveKeyRule,
  weakEntityMissingDiscriminantRule,
  entityMustHaveAttributeRule,
  weakEntityTotalParticipationRule,
  weakEntityNotOn1SideRule,
  weakEntitySingleIdentifyingRule,
  entityNameUniqueRule,
  entityNameNonEmptyRule,
  orphanEntityWarningRule,
  weakEntityNoKeyRule,
  entityRules,
} from './entity'
import { makeDiagram } from '@fixtures/diagrams/makeDiagram'
import { makeEntity, makeRelationship, makeAttribute, makeIsa } from '@fixtures/diagrams/makeNode'
import { makeEREdge, makeAttrEdge, makeIsaEdge } from '@fixtures/diagrams/makeEdge'
import {
  strongEntityWithKey, weakEntityWithDiscriminant, isaHierarchy,
} from '@fixtures/diagrams/composed'

describe('entityMustHaveKeyRule', () => {
  it('fires for strong entity without a key', () => {
    const e = makeEntity({ name: 'Student' })
    const a = makeAttribute({ name: 'name', isKey: false })
    const d = makeDiagram([e, a], [makeAttrEdge(a.id, e.id)])
    const errs = entityMustHaveKeyRule.check(d)
    expect(errs.map((x) => x.targetId)).toEqual([e.id])
  })

  it('does not fire for strong entity with a key', () => {
    expect(entityMustHaveKeyRule.check(strongEntityWithKey())).toEqual([])
  })

  it('does not fire for weak entity', () => {
    expect(entityMustHaveKeyRule.check(weakEntityWithDiscriminant())).toEqual([])
  })

  it('does not fire for ISA child', () => {
    expect(entityMustHaveKeyRule.check(isaHierarchy())).toEqual([])
  })
})

describe('weakEntityMissingDiscriminantRule', () => {
  it('fires for weak entity without discriminant', () => {
    const weak = makeEntity({ name: 'Room', isWeak: true })
    const d = makeDiagram([weak], [])
    expect(weakEntityMissingDiscriminantRule.check(d)).toHaveLength(1)
  })

  it('does not fire for weak with discriminant', () => {
    expect(weakEntityMissingDiscriminantRule.check(weakEntityWithDiscriminant())).toEqual([])
  })

  it('does not fire for strong entity', () => {
    expect(weakEntityMissingDiscriminantRule.check(strongEntityWithKey())).toEqual([])
  })
})

describe('entityMustHaveAttributeRule', () => {
  it('fires for entity with no attributes', () => {
    const e = makeEntity({ name: 'X' })
    const d = makeDiagram([e], [])
    expect(entityMustHaveAttributeRule.check(d)).toHaveLength(1)
  })

  it('does not fire when entity has attributes', () => {
    expect(entityMustHaveAttributeRule.check(strongEntityWithKey())).toEqual([])
  })

  it('does not fire for ISA child even with zero attributes', () => {
    // isaHierarchy's Student/Employee children have no attributes — inherit from parent
    expect(entityMustHaveAttributeRule.check(isaHierarchy())).toEqual([])
  })
})

describe('weakEntityTotalParticipationRule', () => {
  it('fires when weak participation is partial', () => {
    const bldg = makeEntity({ name: 'Building' })
    const room = makeEntity({ name: 'Room', isWeak: true })
    const disc = makeAttribute({ name: 'n', isDiscriminant: true })
    const rel = makeRelationship({ name: 'Located', isIdentifying: true })
    const d = makeDiagram(
      [bldg, room, disc, rel],
      [
        makeAttrEdge(disc.id, room.id),
        makeEREdge(bldg.id, rel.id, { cardinality: '1', participation: 'partial' }),
        makeEREdge(room.id, rel.id, { cardinality: 'N', participation: 'partial' }),
      ],
    )
    const errs = weakEntityTotalParticipationRule.check(d)
    expect(errs.map((e) => e.targetId)).toContain(room.id)
  })

  it('does not fire when weak participation is total', () => {
    expect(weakEntityTotalParticipationRule.check(weakEntityWithDiscriminant())).toEqual([])
  })
})

describe('weakEntityNotOn1SideRule', () => {
  it('fires when weak entity has cardinality 1 on identifying rel', () => {
    const bldg = makeEntity({ name: 'Building' })
    const room = makeEntity({ name: 'Room', isWeak: true })
    const disc = makeAttribute({ name: 'n', isDiscriminant: true })
    const rel = makeRelationship({ name: 'Located', isIdentifying: true })
    const d = makeDiagram(
      [bldg, room, disc, rel],
      [
        makeAttrEdge(disc.id, room.id),
        makeEREdge(bldg.id, rel.id, { cardinality: '1', participation: 'total' }),
        makeEREdge(room.id, rel.id, { cardinality: '1', participation: 'total' }),
      ],
    )
    expect(weakEntityNotOn1SideRule.check(d).map((e) => e.targetId)).toContain(room.id)
  })

  it('does not fire when weak is on N-side', () => {
    expect(weakEntityNotOn1SideRule.check(weakEntityWithDiscriminant())).toEqual([])
  })
})

describe('weakEntitySingleIdentifyingRule', () => {
  it('fires when weak connects to zero identifying rels', () => {
    const w = makeEntity({ name: 'Room', isWeak: true })
    const d = makeAttribute({ name: 'n', isDiscriminant: true })
    const diag = makeDiagram([w, d], [makeAttrEdge(d.id, w.id)])
    expect(weakEntitySingleIdentifyingRule.check(diag).map((e) => e.targetId)).toContain(w.id)
  })

  it('fires when weak connects to >1 identifying rels', () => {
    const bldg = makeEntity({ name: 'Building' })
    const room = makeEntity({ name: 'Room', isWeak: true })
    const disc = makeAttribute({ name: 'n', isDiscriminant: true })
    const rel1 = makeRelationship({ name: 'A', isIdentifying: true })
    const rel2 = makeRelationship({ name: 'B', isIdentifying: true })
    const other = makeEntity({ name: 'Other' })
    const d = makeDiagram(
      [bldg, room, disc, rel1, rel2, other],
      [
        makeAttrEdge(disc.id, room.id),
        makeEREdge(bldg.id, rel1.id, { cardinality: '1', participation: 'total' }),
        makeEREdge(room.id, rel1.id, { cardinality: 'N', participation: 'total' }),
        makeEREdge(other.id, rel2.id, { cardinality: '1', participation: 'total' }),
        makeEREdge(room.id, rel2.id, { cardinality: 'N', participation: 'total' }),
      ],
    )
    expect(weakEntitySingleIdentifyingRule.check(d).map((e) => e.targetId)).toContain(room.id)
  })

  it('does not fire for the canonical weak-with-discriminant fixture', () => {
    expect(weakEntitySingleIdentifyingRule.check(weakEntityWithDiscriminant())).toEqual([])
  })
})

describe('entityNameUniqueRule', () => {
  it('fires when two entities share a name (case-insensitive)', () => {
    const a = makeEntity({ name: 'Student' })
    const b = makeEntity({ name: 'STUDENT' })
    const d = makeDiagram([a, b], [])
    const errs = entityNameUniqueRule.check(d)
    expect(errs.map((e) => e.targetId).sort()).toEqual([a.id, b.id].sort())
  })

  it('does not fire when names differ', () => {
    expect(entityNameUniqueRule.check(isaHierarchy())).toEqual([])
  })
})

describe('entityNameNonEmptyRule', () => {
  it('fires when name is empty or whitespace', () => {
    const e1 = makeEntity({ name: '' })
    const e2 = makeEntity({ name: '   ' })
    const d = makeDiagram([e1, e2], [])
    expect(entityNameNonEmptyRule.check(d)).toHaveLength(2)
  })

  it('does not fire for populated names', () => {
    expect(entityNameNonEmptyRule.check(strongEntityWithKey())).toEqual([])
  })
})

describe('orphanEntityWarningRule', () => {
  it('fires when entity has no relationships', () => {
    const lonely = makeEntity({ name: 'Lonely' })
    const a = makeAttribute({ name: 'k', isKey: true })
    const d = makeDiagram([lonely, a], [makeAttrEdge(a.id, lonely.id)])
    const errs = orphanEntityWarningRule.check(d)
    expect(errs.map((e) => e.targetId)).toContain(lonely.id)
    expect(errs[0]?.severity).toBe('warning')
  })

  it('does not fire when the entity has a relationship', () => {
    expect(orphanEntityWarningRule.check(weakEntityWithDiscriminant())).toEqual([])
  })
})

describe('weakEntityNoKeyRule', () => {
  it('fires when weak entity has a key attribute', () => {
    const weak = makeEntity({ name: 'Room', isWeak: true })
    const k = makeAttribute({ name: 'x', isKey: true })
    const d = makeDiagram([weak, k], [makeAttrEdge(k.id, weak.id)])
    expect(weakEntityNoKeyRule.check(d).map((e) => e.targetId)).toContain(weak.id)
  })

  it('does not fire when weak entity only has a discriminant', () => {
    expect(weakEntityNoKeyRule.check(weakEntityWithDiscriminant())).toEqual([])
  })
})

describe('entityRules barrel', () => {
  it('exports exactly 10 rules', () => {
    expect(entityRules).toHaveLength(10)
  })

  it('every rule has a unique id prefixed chen.entity.*', () => {
    const ids = entityRules.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => id.startsWith('chen.entity.'))).toBe(true)
  })

  it('every rule has category=entity', () => {
    expect(entityRules.every((r) => r.category === 'entity')).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- src/notation/chen/rules/entity.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/notation/chen/rules/entity.ts`:

```ts
import type { Diagram, EntityNode, NodeId, AttributeNode, RelationshipNode, EntityRelationshipEdge } from '@/domain/types'
import {
  incidentEdges, isAttributeEdge, isAttributeNode, isEntityNode,
  isEntityRelationshipEdge, isIsaEdge, isRelationshipNode, nodesByKind,
} from '@/domain/graph'
import type { ValidationError, ValidationRule } from '@/notation/types'

// ——— Helpers ———

const isIsaChild = (diagram: Diagram, entityId: NodeId): boolean => {
  for (const edge of incidentEdges(diagram, entityId)) {
    if (isIsaEdge(edge) && edge.role === 'child' && edge.targetId === entityId) return true
  }
  return false
}

const attributesOf = (diagram: Diagram, entityId: NodeId): readonly AttributeNode[] => {
  const out: AttributeNode[] = []
  for (const edge of incidentEdges(diagram, entityId)) {
    if (!isAttributeEdge(edge) || edge.targetId !== entityId) continue
    const src = diagram.nodesById[edge.sourceId]
    if (src && isAttributeNode(src)) out.push(src)
  }
  return out
}

const identifyingRelationshipsOf = (
  diagram: Diagram,
  entityId: NodeId,
): readonly { rel: RelationshipNode; edge: EntityRelationshipEdge }[] => {
  const out: { rel: RelationshipNode; edge: EntityRelationshipEdge }[] = []
  for (const edge of incidentEdges(diagram, entityId)) {
    if (!isEntityRelationshipEdge(edge)) continue
    const otherId = edge.sourceId === entityId ? edge.targetId : edge.sourceId
    const other = diagram.nodesById[otherId]
    if (other && isRelationshipNode(other) && other.isIdentifying) out.push({ rel: other, edge })
  }
  return out
}

const err = (
  ruleId: string, targetId: NodeId, messageKey: string,
  severity: 'error' | 'warning' = 'error',
  messageParams?: Readonly<Record<string, string>>,
): ValidationError => ({ ruleId, severity, targetId, messageKey, messageParams })

// ——— Rules ———

export const entityMustHaveKeyRule: ValidationRule = {
  id: 'chen.entity.must-have-key',
  severity: 'error',
  category: 'entity',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const e of nodesByKind(diagram, 'entity')) {
      if (e.isWeak) continue
      if (isIsaChild(diagram, e.id)) continue
      const attrs = attributesOf(diagram, e.id)
      if (!attrs.some((a) => a.isKey)) {
        out.push(err('chen.entity.must-have-key', e.id, 'validation.chen.entity.must-have-key'))
      }
    }
    return out
  },
}

export const weakEntityMissingDiscriminantRule: ValidationRule = {
  id: 'chen.entity.weak-missing-discriminant',
  severity: 'error',
  category: 'entity',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const e of nodesByKind(diagram, 'entity')) {
      if (!e.isWeak) continue
      const attrs = attributesOf(diagram, e.id)
      if (!attrs.some((a) => a.isDiscriminant)) {
        out.push(err('chen.entity.weak-missing-discriminant', e.id, 'validation.chen.entity.weak-missing-discriminant'))
      }
    }
    return out
  },
}

export const entityMustHaveAttributeRule: ValidationRule = {
  id: 'chen.entity.must-have-attribute',
  severity: 'error',
  category: 'entity',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const e of nodesByKind(diagram, 'entity')) {
      if (isIsaChild(diagram, e.id)) continue
      if (attributesOf(diagram, e.id).length === 0) {
        out.push(err('chen.entity.must-have-attribute', e.id, 'validation.chen.entity.must-have-attribute'))
      }
    }
    return out
  },
}

export const weakEntityTotalParticipationRule: ValidationRule = {
  id: 'chen.entity.weak-total-participation',
  severity: 'error',
  category: 'entity',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const e of nodesByKind(diagram, 'entity')) {
      if (!e.isWeak) continue
      for (const { edge } of identifyingRelationshipsOf(diagram, e.id)) {
        if (edge.participation !== 'total') {
          out.push(err('chen.entity.weak-total-participation', e.id, 'validation.chen.entity.weak-total-participation'))
          break
        }
      }
    }
    return out
  },
}

export const weakEntityNotOn1SideRule: ValidationRule = {
  id: 'chen.entity.weak-not-on-1-side',
  severity: 'error',
  category: 'entity',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const e of nodesByKind(diagram, 'entity')) {
      if (!e.isWeak) continue
      for (const { edge } of identifyingRelationshipsOf(diagram, e.id)) {
        if (edge.cardinality === '1') {
          out.push(err('chen.entity.weak-not-on-1-side', e.id, 'validation.chen.entity.weak-not-on-1-side'))
          break
        }
      }
    }
    return out
  },
}

export const weakEntitySingleIdentifyingRule: ValidationRule = {
  id: 'chen.entity.weak-single-identifying',
  severity: 'error',
  category: 'entity',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const e of nodesByKind(diagram, 'entity')) {
      if (!e.isWeak) continue
      const ids = new Set(identifyingRelationshipsOf(diagram, e.id).map((x) => x.rel.id))
      if (ids.size !== 1) {
        out.push(err(
          'chen.entity.weak-single-identifying', e.id,
          'validation.chen.entity.weak-single-identifying',
          'error',
          { count: String(ids.size) },
        ))
      }
    }
    return out
  },
}

export const entityNameUniqueRule: ValidationRule = {
  id: 'chen.entity.name-unique',
  severity: 'error',
  category: 'entity',
  check: (diagram) => {
    const out: ValidationError[] = []
    const groups = new Map<string, EntityNode[]>()
    for (const e of nodesByKind(diagram, 'entity')) {
      const key = e.name.trim().toLowerCase()
      if (key.length === 0) continue
      const list = groups.get(key) ?? []
      list.push(e)
      groups.set(key, list)
    }
    for (const list of groups.values()) {
      if (list.length < 2) continue
      for (const e of list) {
        out.push(err(
          'chen.entity.name-unique', e.id,
          'validation.chen.entity.name-unique',
          'error',
          { name: e.name },
        ))
      }
    }
    return out
  },
}

export const entityNameNonEmptyRule: ValidationRule = {
  id: 'chen.entity.name-non-empty',
  severity: 'error',
  category: 'entity',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const e of nodesByKind(diagram, 'entity')) {
      if (e.name.trim().length === 0) {
        out.push(err('chen.entity.name-non-empty', e.id, 'validation.chen.entity.name-non-empty'))
      }
    }
    return out
  },
}

export const orphanEntityWarningRule: ValidationRule = {
  id: 'chen.entity.orphan-warning',
  severity: 'warning',
  category: 'entity',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const e of nodesByKind(diagram, 'entity')) {
      const hasRelationship = incidentEdges(diagram, e.id).some((edge) => {
        if (!isEntityRelationshipEdge(edge)) return false
        const otherId = edge.sourceId === e.id ? edge.targetId : edge.sourceId
        const other = diagram.nodesById[otherId]
        return !!other && isRelationshipNode(other)
      })
      if (!hasRelationship) {
        out.push(err('chen.entity.orphan-warning', e.id, 'validation.chen.entity.orphan-warning', 'warning'))
      }
    }
    return out
  },
}

export const weakEntityNoKeyRule: ValidationRule = {
  id: 'chen.entity.weak-no-key',
  severity: 'error',
  category: 'entity',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const e of nodesByKind(diagram, 'entity')) {
      if (!e.isWeak) continue
      if (attributesOf(diagram, e.id).some((a) => a.isKey)) {
        out.push(err('chen.entity.weak-no-key', e.id, 'validation.chen.entity.weak-no-key'))
      }
    }
    return out
  },
}

export const entityRules: readonly ValidationRule[] = [
  entityMustHaveKeyRule,
  weakEntityMissingDiscriminantRule,
  entityMustHaveAttributeRule,
  weakEntityTotalParticipationRule,
  weakEntityNotOn1SideRule,
  weakEntitySingleIdentifyingRule,
  entityNameUniqueRule,
  entityNameNonEmptyRule,
  orphanEntityWarningRule,
  weakEntityNoKeyRule,
] as const
```

- [ ] **Step 4: Run tests**

Run: `pnpm test -- src/notation/chen/rules/entity.test.ts`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/notation/chen/rules/entity.ts src/notation/chen/rules/entity.test.ts
git commit -F /tmp/phase1-task8-msg.txt
```

`/tmp/phase1-task8-msg.txt`:

```
feat(notation/chen): add entity validation rules (10)

Ports 1.1-1.8 + orphan-warning from legacy and adds the new
weak-no-key rule. Name-uniqueness is now a first-class rule
(previously a dangling helper).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

---

## Task 9: Relationship Rules (7)

**Files:**
- Create: `src/notation/chen/rules/relationship.ts`
- Create: `src/notation/chen/rules/relationship.test.ts`

Rule ids:

| ID | Severity | Summary |
|---|---|---|
| `chen.relationship.min-two-entities` | error | Relationship connects ≥2 entities (or is recursive with 2 edges to the same entity). |
| `chen.relationship.cardinality-required` | error | Every incident ER edge has cardinality set. |
| `chen.relationship.participation-required` | error | Every incident ER edge has participation set. |
| `chen.relationship.identifying-needs-weak` | error | Identifying relationship connects ≥1 weak entity. |
| `chen.relationship.non-identifying-not-weak` | error | Non-identifying relationship should not be marked identifying (structural placeholder — will surface when import sets identifying=true without any weak participant). |
| `chen.relationship.name-unique` | error | Relationship names unique (case-insensitive). |
| `chen.relationship.recursive-roles-distinct` | error | Recursive edges have distinct non-empty roles. |

- [ ] **Step 1: Write the failing tests**

Create `src/notation/chen/rules/relationship.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  relationshipMinTwoEntitiesRule,
  relationshipCardinalityRequiredRule,
  relationshipParticipationRequiredRule,
  identifyingRelationshipNeedsWeakRule,
  nonIdentifyingNotWeakRule,
  relationshipNameUniqueRule,
  recursiveRolesDistinctRule,
  relationshipRules,
} from './relationship'
import { makeDiagram } from '@fixtures/diagrams/makeDiagram'
import { makeEntity, makeRelationship } from '@fixtures/diagrams/makeNode'
import { makeEREdge } from '@fixtures/diagrams/makeEdge'
import {
  weakEntityWithDiscriminant, naryRelationship, recursiveRelationship,
} from '@fixtures/diagrams/composed'

describe('relationshipMinTwoEntitiesRule', () => {
  it('fires for relationship with only 1 ER edge', () => {
    const e = makeEntity({ name: 'A' })
    const r = makeRelationship({ name: 'Rel' })
    const d = makeDiagram([e, r], [makeEREdge(e.id, r.id)])
    expect(relationshipMinTwoEntitiesRule.check(d).map((x) => x.targetId)).toContain(r.id)
  })

  it('does not fire for binary relationship', () => {
    expect(relationshipMinTwoEntitiesRule.check(weakEntityWithDiscriminant())).toEqual([])
  })

  it('does not fire for recursive (2 edges to same entity)', () => {
    expect(relationshipMinTwoEntitiesRule.check(recursiveRelationship())).toEqual([])
  })
})

describe('relationshipCardinalityRequiredRule', () => {
  it('fires when an incident ER edge has no cardinality', () => {
    const e1 = makeEntity({ name: 'A' })
    const e2 = makeEntity({ name: 'B' })
    const r = makeRelationship({ name: 'Rel' })
    const bad = makeEREdge(e1.id, r.id)
    // Force invalid (cast for test)
    ;(bad as { cardinality: unknown }).cardinality = ''
    const d = makeDiagram([e1, e2, r], [bad, makeEREdge(e2.id, r.id)])
    expect(relationshipCardinalityRequiredRule.check(d).map((x) => x.targetId)).toContain(r.id)
  })

  it('does not fire on healthy relationship', () => {
    expect(relationshipCardinalityRequiredRule.check(naryRelationship())).toEqual([])
  })
})

describe('relationshipParticipationRequiredRule', () => {
  it('fires when an incident ER edge has invalid participation', () => {
    const e1 = makeEntity({ name: 'A' })
    const e2 = makeEntity({ name: 'B' })
    const r = makeRelationship({ name: 'Rel' })
    const bad = makeEREdge(e1.id, r.id)
    ;(bad as { participation: unknown }).participation = 'maybe'
    const d = makeDiagram([e1, e2, r], [bad, makeEREdge(e2.id, r.id)])
    expect(relationshipParticipationRequiredRule.check(d).map((x) => x.targetId)).toContain(r.id)
  })

  it('does not fire on healthy relationship', () => {
    expect(relationshipParticipationRequiredRule.check(naryRelationship())).toEqual([])
  })
})

describe('identifyingRelationshipNeedsWeakRule', () => {
  it('fires when identifying rel has no weak participant', () => {
    const a = makeEntity({ name: 'A' })
    const b = makeEntity({ name: 'B' })
    const r = makeRelationship({ name: 'R', isIdentifying: true })
    const d = makeDiagram([a, b, r], [
      makeEREdge(a.id, r.id, { cardinality: '1', participation: 'partial' }),
      makeEREdge(b.id, r.id, { cardinality: 'N', participation: 'total' }),
    ])
    expect(identifyingRelationshipNeedsWeakRule.check(d).map((x) => x.targetId)).toContain(r.id)
  })

  it('does not fire when identifying rel has a weak participant', () => {
    expect(identifyingRelationshipNeedsWeakRule.check(weakEntityWithDiscriminant())).toEqual([])
  })
})

describe('nonIdentifyingNotWeakRule', () => {
  // This rule catches imported data where isIdentifying=true is set but no weak entity
  // participates — effectively equivalent to identifyingRelationshipNeedsWeakRule, but the
  // rule-id surfaces a different message for the inverse lens (user marked it identifying by mistake).
  it('fires when isIdentifying=true but no weak participant', () => {
    const a = makeEntity({ name: 'A' })
    const b = makeEntity({ name: 'B' })
    const r = makeRelationship({ name: 'R', isIdentifying: true })
    const d = makeDiagram([a, b, r], [
      makeEREdge(a.id, r.id, { cardinality: '1', participation: 'partial' }),
      makeEREdge(b.id, r.id, { cardinality: 'N', participation: 'total' }),
    ])
    expect(nonIdentifyingNotWeakRule.check(d).map((x) => x.targetId)).toContain(r.id)
  })

  it('does not fire for a non-identifying relationship', () => {
    expect(nonIdentifyingNotWeakRule.check(naryRelationship())).toEqual([])
  })

  it('does not fire when identifying relationship has a weak participant', () => {
    expect(nonIdentifyingNotWeakRule.check(weakEntityWithDiscriminant())).toEqual([])
  })
})

describe('relationshipNameUniqueRule', () => {
  it('fires when two relationships share a name (case-insensitive)', () => {
    const e1 = makeEntity({ name: 'A' })
    const e2 = makeEntity({ name: 'B' })
    const e3 = makeEntity({ name: 'C' })
    const r1 = makeRelationship({ name: 'Likes' })
    const r2 = makeRelationship({ name: 'likes' })
    const d = makeDiagram(
      [e1, e2, e3, r1, r2],
      [
        makeEREdge(e1.id, r1.id), makeEREdge(e2.id, r1.id),
        makeEREdge(e2.id, r2.id), makeEREdge(e3.id, r2.id),
      ],
    )
    const errs = relationshipNameUniqueRule.check(d)
    expect(errs.map((x) => x.targetId).sort()).toEqual([r1.id, r2.id].sort())
  })

  it('does not fire when names differ', () => {
    expect(relationshipNameUniqueRule.check(naryRelationship())).toEqual([])
  })
})

describe('recursiveRolesDistinctRule', () => {
  it('fires when recursive edges lack roles', () => {
    const e = makeEntity({ name: 'Emp' })
    const r = makeRelationship({ name: 'Boss' })
    const d = makeDiagram([e, r], [makeEREdge(e.id, r.id), makeEREdge(e.id, r.id)])
    expect(recursiveRolesDistinctRule.check(d).length).toBeGreaterThan(0)
  })

  it('fires when recursive edges share the same role', () => {
    const e = makeEntity({ name: 'Emp' })
    const r = makeRelationship({ name: 'Boss' })
    const d = makeDiagram([e, r], [
      makeEREdge(e.id, r.id, { role: 'x' }),
      makeEREdge(e.id, r.id, { role: 'x' }),
    ])
    expect(recursiveRolesDistinctRule.check(d).length).toBeGreaterThan(0)
  })

  it('does not fire when roles are distinct and non-empty', () => {
    expect(recursiveRolesDistinctRule.check(recursiveRelationship())).toEqual([])
  })
})

describe('relationshipRules barrel', () => {
  it('exports exactly 7 rules', () => {
    expect(relationshipRules).toHaveLength(7)
  })

  it('every rule id is unique and prefixed chen.relationship.*', () => {
    const ids = relationshipRules.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => id.startsWith('chen.relationship.'))).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/notation/chen/rules/relationship.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/notation/chen/rules/relationship.ts`:

```ts
import type { Diagram, NodeId, RelationshipNode, EntityRelationshipEdge } from '@/domain/types'
import {
  incidentEdges, isEntityNode, isEntityRelationshipEdge, nodesByKind,
} from '@/domain/graph'
import type { ValidationError, ValidationRule } from '@/notation/types'

const incidentERs = (diagram: Diagram, relId: NodeId): readonly EntityRelationshipEdge[] =>
  incidentEdges(diagram, relId).filter(isEntityRelationshipEdge)

const connectedEntityIds = (diagram: Diagram, relId: NodeId): readonly NodeId[] =>
  incidentERs(diagram, relId).map((e) => e.sourceId === relId ? e.targetId : e.sourceId)

const err = (
  ruleId: string, targetId: NodeId, messageKey: string,
  severity: 'error' | 'warning' = 'error',
  messageParams?: Readonly<Record<string, string>>,
): ValidationError => ({ ruleId, severity, targetId, messageKey, messageParams })

export const relationshipMinTwoEntitiesRule: ValidationRule = {
  id: 'chen.relationship.min-two-entities',
  severity: 'error',
  category: 'relationship',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const r of nodesByKind(diagram, 'relationship')) {
      const count = incidentERs(diagram, r.id).length
      if (count < 2) {
        out.push(err('chen.relationship.min-two-entities', r.id, 'validation.chen.relationship.min-two-entities'))
      }
    }
    return out
  },
}

export const relationshipCardinalityRequiredRule: ValidationRule = {
  id: 'chen.relationship.cardinality-required',
  severity: 'error',
  category: 'relationship',
  check: (diagram) => {
    const VALID = new Set<string>(['1', 'N', 'M'])
    const out: ValidationError[] = []
    for (const r of nodesByKind(diagram, 'relationship')) {
      for (const edge of incidentERs(diagram, r.id)) {
        if (!VALID.has(String(edge.cardinality).trim())) {
          out.push(err('chen.relationship.cardinality-required', r.id, 'validation.chen.relationship.cardinality-required'))
          break
        }
      }
    }
    return out
  },
}

export const relationshipParticipationRequiredRule: ValidationRule = {
  id: 'chen.relationship.participation-required',
  severity: 'error',
  category: 'relationship',
  check: (diagram) => {
    const VALID = new Set<string>(['total', 'partial'])
    const out: ValidationError[] = []
    for (const r of nodesByKind(diagram, 'relationship')) {
      for (const edge of incidentERs(diagram, r.id)) {
        if (!VALID.has(String(edge.participation))) {
          out.push(err('chen.relationship.participation-required', r.id, 'validation.chen.relationship.participation-required'))
          break
        }
      }
    }
    return out
  },
}

export const identifyingRelationshipNeedsWeakRule: ValidationRule = {
  id: 'chen.relationship.identifying-needs-weak',
  severity: 'error',
  category: 'relationship',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const r of nodesByKind(diagram, 'relationship')) {
      if (!r.isIdentifying) continue
      const hasWeak = connectedEntityIds(diagram, r.id)
        .map((id) => diagram.nodesById[id])
        .some((n) => n && isEntityNode(n) && n.isWeak)
      if (!hasWeak) {
        out.push(err('chen.relationship.identifying-needs-weak', r.id, 'validation.chen.relationship.identifying-needs-weak'))
      }
    }
    return out
  },
}

export const nonIdentifyingNotWeakRule: ValidationRule = {
  id: 'chen.relationship.non-identifying-not-weak',
  severity: 'error',
  category: 'relationship',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const r of nodesByKind(diagram, 'relationship')) {
      if (!r.isIdentifying) continue
      const hasWeak = connectedEntityIds(diagram, r.id)
        .map((id) => diagram.nodesById[id])
        .some((n) => n && isEntityNode(n) && n.isWeak)
      if (!hasWeak) {
        out.push(err('chen.relationship.non-identifying-not-weak', r.id, 'validation.chen.relationship.non-identifying-not-weak'))
      }
    }
    return out
  },
}

export const relationshipNameUniqueRule: ValidationRule = {
  id: 'chen.relationship.name-unique',
  severity: 'error',
  category: 'relationship',
  check: (diagram) => {
    const out: ValidationError[] = []
    const groups = new Map<string, RelationshipNode[]>()
    for (const r of nodesByKind(diagram, 'relationship')) {
      const key = r.name.trim().toLowerCase()
      if (key.length === 0) continue
      const list = groups.get(key) ?? []
      list.push(r)
      groups.set(key, list)
    }
    for (const list of groups.values()) {
      if (list.length < 2) continue
      for (const r of list) {
        out.push(err(
          'chen.relationship.name-unique', r.id,
          'validation.chen.relationship.name-unique',
          'error',
          { name: r.name },
        ))
      }
    }
    return out
  },
}

export const recursiveRolesDistinctRule: ValidationRule = {
  id: 'chen.relationship.recursive-roles-distinct',
  severity: 'error',
  category: 'relationship',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const r of nodesByKind(diagram, 'relationship')) {
      const ers = incidentERs(diagram, r.id)
      const groups = new Map<NodeId, EntityRelationshipEdge[]>()
      for (const e of ers) {
        const other = e.sourceId === r.id ? e.targetId : e.sourceId
        const list = groups.get(other) ?? []
        list.push(e)
        groups.set(other, list)
      }
      for (const [, edges] of groups) {
        if (edges.length < 2) continue
        const roles = edges.map((e) => (e.role ?? '').trim())
        if (roles.some((r) => r.length === 0) || new Set(roles).size !== roles.length) {
          for (const e of edges) {
            out.push(err('chen.relationship.recursive-roles-distinct', e.id, 'validation.chen.relationship.recursive-roles-distinct'))
          }
        }
      }
    }
    return out
  },
}

export const relationshipRules: readonly ValidationRule[] = [
  relationshipMinTwoEntitiesRule,
  relationshipCardinalityRequiredRule,
  relationshipParticipationRequiredRule,
  identifyingRelationshipNeedsWeakRule,
  nonIdentifyingNotWeakRule,
  relationshipNameUniqueRule,
  recursiveRolesDistinctRule,
] as const
```

- [ ] **Step 4: Run tests**

Run: `pnpm test -- src/notation/chen/rules/relationship.test.ts`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/notation/chen/rules/relationship.ts src/notation/chen/rules/relationship.test.ts
git commit -F /tmp/phase1-task9-msg.txt
```

`/tmp/phase1-task9-msg.txt`:

```
feat(notation/chen): add relationship validation rules (7)

Ports 2.1-2.4 + 2.6 from legacy and adds new 2.5 (non-identifying-
not-weak) and 2.7 (recursive-roles-distinct). Name-uniqueness is
wired into the main flow, not a dangling helper.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

---

## Task 10: Attribute Rules (12)

**Files:**
- Create: `src/notation/chen/rules/attribute.ts`
- Create: `src/notation/chen/rules/attribute.test.ts`

Rule ids:

| ID | Severity | Summary |
|---|---|---|
| `chen.attribute.single-parent` | error | Attribute attaches to exactly one parent. |
| `chen.attribute.no-dual-parent` | error | Attribute does not attach to both entity and relationship. |
| `chen.attribute.discriminant-weak-only` | error | Discriminant only on attributes of weak entities. |
| `chen.attribute.not-key-and-derived` | error | Attribute not simultaneously key and derived. |
| `chen.attribute.key-not-multivalued` | error | Key not multivalued. |
| `chen.attribute.discriminant-not-multivalued` | error | Discriminant not multivalued. |
| `chen.attribute.relationship-not-key` | error | Relationship-owned attributes cannot be key. |
| `chen.attribute.name-unique` | error | Attribute names unique within the same parent. |
| `chen.attribute.composite-needs-sub` | error | Composite attribute has ≥1 sub-attribute. |
| `chen.attribute.sub-not-key` | error | Sub-attribute cannot be key. |
| `chen.attribute.sub-not-discriminant` | error | Sub-attribute cannot be discriminant. |
| `chen.attribute.sub-not-composite` | error | Sub-attribute cannot itself be composite. |

- [ ] **Step 1: Write the failing tests**

Create `src/notation/chen/rules/attribute.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  attributeSingleParentRule,
  attributeNoDualParentRule,
  discriminantWeakOnlyRule,
  attributeNotKeyAndDerivedRule,
  keyNotMultivaluedRule,
  discriminantNotMultivaluedRule,
  relationshipAttributeNotKeyRule,
  attributeNameUniqueRule,
  compositeNeedsSubRule,
  subAttrNotKeyRule,
  subAttrNotDiscriminantRule,
  subAttrNotCompositeRule,
  attributeRules,
} from './attribute'
import { makeDiagram } from '@fixtures/diagrams/makeDiagram'
import { makeEntity, makeRelationship, makeAttribute } from '@fixtures/diagrams/makeNode'
import { makeAttrEdge, makeEREdge } from '@fixtures/diagrams/makeEdge'
import {
  strongEntityWithKey, weakEntityWithDiscriminant, compositeAttribute,
} from '@fixtures/diagrams/composed'

describe('attributeSingleParentRule', () => {
  it('fires for orphan attribute (no edge)', () => {
    const a = makeAttribute({ name: 'x' })
    const d = makeDiagram([a], [])
    expect(attributeSingleParentRule.check(d).map((e) => e.targetId)).toContain(a.id)
  })

  it('does not fire for attribute with one parent edge', () => {
    expect(attributeSingleParentRule.check(strongEntityWithKey())).toEqual([])
  })
})

describe('attributeNoDualParentRule', () => {
  it('fires when attribute edges point to both entity and relationship', () => {
    const e = makeEntity({ name: 'A' })
    const e2 = makeEntity({ name: 'B' })
    const r = makeRelationship({ name: 'R' })
    const a = makeAttribute({ name: 'x' })
    const d = makeDiagram([e, e2, r, a], [
      makeEREdge(e.id, r.id), makeEREdge(e2.id, r.id),
      makeAttrEdge(a.id, e.id),
      makeAttrEdge(a.id, r.id),
    ])
    expect(attributeNoDualParentRule.check(d).map((x) => x.targetId)).toContain(a.id)
  })

  it('does not fire on healthy diagram', () => {
    expect(attributeNoDualParentRule.check(strongEntityWithKey())).toEqual([])
  })
})

describe('discriminantWeakOnlyRule', () => {
  it('fires for discriminant on a strong entity attribute', () => {
    const e = makeEntity({ name: 'X' })
    const a = makeAttribute({ name: 'd', isDiscriminant: true })
    const d = makeDiagram([e, a], [makeAttrEdge(a.id, e.id)])
    expect(discriminantWeakOnlyRule.check(d).map((x) => x.targetId)).toContain(a.id)
  })

  it('fires for discriminant on a relationship attribute', () => {
    const e1 = makeEntity({ name: 'A' })
    const e2 = makeEntity({ name: 'B' })
    const r = makeRelationship({ name: 'R' })
    const a = makeAttribute({ name: 'd', isDiscriminant: true })
    const d = makeDiagram([e1, e2, r, a], [
      makeEREdge(e1.id, r.id), makeEREdge(e2.id, r.id),
      makeAttrEdge(a.id, r.id),
    ])
    expect(discriminantWeakOnlyRule.check(d).map((x) => x.targetId)).toContain(a.id)
  })

  it('does not fire on weak-with-discriminant', () => {
    expect(discriminantWeakOnlyRule.check(weakEntityWithDiscriminant())).toEqual([])
  })
})

describe('attributeNotKeyAndDerivedRule', () => {
  it('fires when attribute is both key and derived', () => {
    const e = makeEntity({ name: 'X' })
    const a = makeAttribute({ name: 'x', isKey: true, isDerived: true })
    const d = makeDiagram([e, a], [makeAttrEdge(a.id, e.id)])
    expect(attributeNotKeyAndDerivedRule.check(d).map((x) => x.targetId)).toContain(a.id)
  })

  it('does not fire for key-only or derived-only attributes', () => {
    expect(attributeNotKeyAndDerivedRule.check(strongEntityWithKey())).toEqual([])
  })
})

describe('keyNotMultivaluedRule', () => {
  it('fires when key is multivalued', () => {
    const e = makeEntity({ name: 'X' })
    const a = makeAttribute({ name: 'x', isKey: true, isMultivalued: true })
    const d = makeDiagram([e, a], [makeAttrEdge(a.id, e.id)])
    expect(keyNotMultivaluedRule.check(d).map((x) => x.targetId)).toContain(a.id)
  })

  it('does not fire for single-valued key', () => {
    expect(keyNotMultivaluedRule.check(strongEntityWithKey())).toEqual([])
  })
})

describe('discriminantNotMultivaluedRule', () => {
  it('fires when discriminant is multivalued', () => {
    const e = makeEntity({ name: 'X', isWeak: true })
    const a = makeAttribute({ name: 'x', isDiscriminant: true, isMultivalued: true })
    const d = makeDiagram([e, a], [makeAttrEdge(a.id, e.id)])
    expect(discriminantNotMultivaluedRule.check(d).map((x) => x.targetId)).toContain(a.id)
  })

  it('does not fire on canonical weak-with-discriminant', () => {
    expect(discriminantNotMultivaluedRule.check(weakEntityWithDiscriminant())).toEqual([])
  })
})

describe('relationshipAttributeNotKeyRule', () => {
  it('fires when attribute of a relationship is key', () => {
    const e1 = makeEntity({ name: 'A' })
    const e2 = makeEntity({ name: 'B' })
    const r = makeRelationship({ name: 'R' })
    const a = makeAttribute({ name: 'x', isKey: true })
    const d = makeDiagram([e1, e2, r, a], [
      makeEREdge(e1.id, r.id), makeEREdge(e2.id, r.id),
      makeAttrEdge(a.id, r.id),
    ])
    expect(relationshipAttributeNotKeyRule.check(d).map((x) => x.targetId)).toContain(a.id)
  })

  it('does not fire when relationship attribute is non-key', () => {
    const e1 = makeEntity({ name: 'A' })
    const e2 = makeEntity({ name: 'B' })
    const r = makeRelationship({ name: 'R' })
    const a = makeAttribute({ name: 'since', isKey: false })
    const d = makeDiagram([e1, e2, r, a], [
      makeEREdge(e1.id, r.id), makeEREdge(e2.id, r.id),
      makeAttrEdge(a.id, r.id),
    ])
    expect(relationshipAttributeNotKeyRule.check(d)).toEqual([])
  })
})

describe('attributeNameUniqueRule', () => {
  it('fires when two attributes of the same entity share a name', () => {
    const e = makeEntity({ name: 'E' })
    const a1 = makeAttribute({ name: 'name' })
    const a2 = makeAttribute({ name: 'NAME' })
    const d = makeDiagram([e, a1, a2], [
      makeAttrEdge(a1.id, e.id),
      makeAttrEdge(a2.id, e.id),
    ])
    expect(attributeNameUniqueRule.check(d).map((x) => x.targetId).sort())
      .toEqual([a1.id, a2.id].sort())
  })

  it('does not fire when same name on different entities', () => {
    const e1 = makeEntity({ name: 'A' })
    const e2 = makeEntity({ name: 'B' })
    const a1 = makeAttribute({ name: 'id', isKey: true })
    const a2 = makeAttribute({ name: 'id', isKey: true })
    const d = makeDiagram([e1, e2, a1, a2], [
      makeAttrEdge(a1.id, e1.id),
      makeAttrEdge(a2.id, e2.id),
    ])
    expect(attributeNameUniqueRule.check(d)).toEqual([])
  })
})

describe('compositeNeedsSubRule', () => {
  it('fires for composite attribute with no sub-attributes', () => {
    const e = makeEntity({ name: 'E' })
    const c = makeAttribute({ name: 'addr', isComposite: true })
    const d = makeDiagram([e, c], [makeAttrEdge(c.id, e.id)])
    expect(compositeNeedsSubRule.check(d).map((x) => x.targetId)).toContain(c.id)
  })

  it('does not fire on canonical composite', () => {
    expect(compositeNeedsSubRule.check(compositeAttribute())).toEqual([])
  })
})

describe('subAttrNotKeyRule', () => {
  it('fires when sub-attribute is key', () => {
    const e = makeEntity({ name: 'E' })
    const parent = makeAttribute({ name: 'addr', isComposite: true })
    const child = makeAttribute({ name: 'street', isKey: true })
    const d = makeDiagram([e, parent, child], [
      makeAttrEdge(parent.id, e.id),
      makeAttrEdge(child.id, parent.id),
    ])
    expect(subAttrNotKeyRule.check(d).map((x) => x.targetId)).toContain(child.id)
  })

  it('does not fire on canonical composite', () => {
    expect(subAttrNotKeyRule.check(compositeAttribute())).toEqual([])
  })
})

describe('subAttrNotDiscriminantRule', () => {
  it('fires when sub-attribute is discriminant', () => {
    const e = makeEntity({ name: 'E' })
    const parent = makeAttribute({ name: 'addr', isComposite: true })
    const child = makeAttribute({ name: 'n', isDiscriminant: true })
    const d = makeDiagram([e, parent, child], [
      makeAttrEdge(parent.id, e.id),
      makeAttrEdge(child.id, parent.id),
    ])
    expect(subAttrNotDiscriminantRule.check(d).map((x) => x.targetId)).toContain(child.id)
  })

  it('does not fire on canonical composite', () => {
    expect(subAttrNotDiscriminantRule.check(compositeAttribute())).toEqual([])
  })
})

describe('subAttrNotCompositeRule', () => {
  it('fires when sub-attribute is also composite', () => {
    const e = makeEntity({ name: 'E' })
    const parent = makeAttribute({ name: 'addr', isComposite: true })
    const child = makeAttribute({ name: 'inner', isComposite: true })
    const grand = makeAttribute({ name: 'z' })
    const d = makeDiagram([e, parent, child, grand], [
      makeAttrEdge(parent.id, e.id),
      makeAttrEdge(child.id, parent.id),
      makeAttrEdge(grand.id, child.id),
    ])
    expect(subAttrNotCompositeRule.check(d).map((x) => x.targetId)).toContain(child.id)
  })

  it('does not fire on canonical composite', () => {
    expect(subAttrNotCompositeRule.check(compositeAttribute())).toEqual([])
  })
})

describe('attributeRules barrel', () => {
  it('exports exactly 12 rules', () => {
    expect(attributeRules).toHaveLength(12)
  })

  it('every rule id is unique and prefixed chen.attribute.*', () => {
    const ids = attributeRules.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => id.startsWith('chen.attribute.'))).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/notation/chen/rules/attribute.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/notation/chen/rules/attribute.ts`:

```ts
import type { Diagram, NodeId, AttributeNode, AttributeEdge } from '@/domain/types'
import {
  incidentEdges, isAttributeEdge, isAttributeNode, isEntityNode,
  isRelationshipNode, nodesByKind,
} from '@/domain/graph'
import type { ValidationError, ValidationRule } from '@/notation/types'

const outboundAttrEdges = (diagram: Diagram, attrId: NodeId): readonly AttributeEdge[] =>
  incidentEdges(diagram, attrId).filter(isAttributeEdge).filter((e) => e.sourceId === attrId)

const parentOf = (diagram: Diagram, attrId: NodeId) => {
  const edges = outboundAttrEdges(diagram, attrId)
  if (edges.length !== 1) return null
  return diagram.nodesById[edges[0]!.targetId] ?? null
}

const err = (
  ruleId: string, targetId: NodeId, messageKey: string,
  severity: 'error' | 'warning' = 'error',
  messageParams?: Readonly<Record<string, string>>,
): ValidationError => ({ ruleId, severity, targetId, messageKey, messageParams })

export const attributeSingleParentRule: ValidationRule = {
  id: 'chen.attribute.single-parent',
  severity: 'error',
  category: 'attribute',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const a of nodesByKind(diagram, 'attribute')) {
      const edges = outboundAttrEdges(diagram, a.id)
      if (edges.length !== 1) {
        out.push(err('chen.attribute.single-parent', a.id, 'validation.chen.attribute.single-parent'))
      }
    }
    return out
  },
}

export const attributeNoDualParentRule: ValidationRule = {
  id: 'chen.attribute.no-dual-parent',
  severity: 'error',
  category: 'attribute',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const a of nodesByKind(diagram, 'attribute')) {
      const parents = outboundAttrEdges(diagram, a.id)
        .map((e) => diagram.nodesById[e.targetId])
        .filter((n): n is NonNullable<typeof n> => !!n)
      const onEntity = parents.some(isEntityNode)
      const onRelationship = parents.some(isRelationshipNode)
      if (onEntity && onRelationship) {
        out.push(err('chen.attribute.no-dual-parent', a.id, 'validation.chen.attribute.no-dual-parent'))
      }
    }
    return out
  },
}

export const discriminantWeakOnlyRule: ValidationRule = {
  id: 'chen.attribute.discriminant-weak-only',
  severity: 'error',
  category: 'attribute',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const a of nodesByKind(diagram, 'attribute')) {
      if (!a.isDiscriminant) continue
      const parent = parentOf(diagram, a.id)
      if (!parent) continue
      const ok = isEntityNode(parent) && parent.isWeak
      if (!ok) {
        out.push(err('chen.attribute.discriminant-weak-only', a.id, 'validation.chen.attribute.discriminant-weak-only'))
      }
    }
    return out
  },
}

export const attributeNotKeyAndDerivedRule: ValidationRule = {
  id: 'chen.attribute.not-key-and-derived',
  severity: 'error',
  category: 'attribute',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const a of nodesByKind(diagram, 'attribute')) {
      if (a.isKey && a.isDerived) {
        out.push(err('chen.attribute.not-key-and-derived', a.id, 'validation.chen.attribute.not-key-and-derived'))
      }
    }
    return out
  },
}

export const keyNotMultivaluedRule: ValidationRule = {
  id: 'chen.attribute.key-not-multivalued',
  severity: 'error',
  category: 'attribute',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const a of nodesByKind(diagram, 'attribute')) {
      if (a.isKey && a.isMultivalued) {
        out.push(err('chen.attribute.key-not-multivalued', a.id, 'validation.chen.attribute.key-not-multivalued'))
      }
    }
    return out
  },
}

export const discriminantNotMultivaluedRule: ValidationRule = {
  id: 'chen.attribute.discriminant-not-multivalued',
  severity: 'error',
  category: 'attribute',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const a of nodesByKind(diagram, 'attribute')) {
      if (a.isDiscriminant && a.isMultivalued) {
        out.push(err('chen.attribute.discriminant-not-multivalued', a.id, 'validation.chen.attribute.discriminant-not-multivalued'))
      }
    }
    return out
  },
}

export const relationshipAttributeNotKeyRule: ValidationRule = {
  id: 'chen.attribute.relationship-not-key',
  severity: 'error',
  category: 'attribute',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const a of nodesByKind(diagram, 'attribute')) {
      if (!a.isKey) continue
      const parent = parentOf(diagram, a.id)
      if (parent && isRelationshipNode(parent)) {
        out.push(err('chen.attribute.relationship-not-key', a.id, 'validation.chen.attribute.relationship-not-key'))
      }
    }
    return out
  },
}

export const attributeNameUniqueRule: ValidationRule = {
  id: 'chen.attribute.name-unique',
  severity: 'error',
  category: 'attribute',
  check: (diagram) => {
    const out: ValidationError[] = []
    const groups = new Map<string, AttributeNode[]>()
    for (const a of nodesByKind(diagram, 'attribute')) {
      const parent = parentOf(diagram, a.id)
      if (!parent) continue
      const name = a.name.trim().toLowerCase()
      if (name.length === 0) continue
      const key = `${parent.id}::${name}`
      const list = groups.get(key) ?? []
      list.push(a)
      groups.set(key, list)
    }
    for (const list of groups.values()) {
      if (list.length < 2) continue
      for (const a of list) {
        out.push(err(
          'chen.attribute.name-unique', a.id,
          'validation.chen.attribute.name-unique',
          'error',
          { name: a.name },
        ))
      }
    }
    return out
  },
}

export const compositeNeedsSubRule: ValidationRule = {
  id: 'chen.attribute.composite-needs-sub',
  severity: 'error',
  category: 'attribute',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const a of nodesByKind(diagram, 'attribute')) {
      if (!a.isComposite) continue
      // Count inbound attribute-of edges from other attributes (sub-attributes).
      const hasSub = incidentEdges(diagram, a.id).some((edge) => {
        if (!isAttributeEdge(edge) || edge.targetId !== a.id) return false
        const src = diagram.nodesById[edge.sourceId]
        return !!src && isAttributeNode(src)
      })
      if (!hasSub) {
        out.push(err('chen.attribute.composite-needs-sub', a.id, 'validation.chen.attribute.composite-needs-sub'))
      }
    }
    return out
  },
}

const isSubAttribute = (diagram: Diagram, attrId: NodeId): boolean => {
  const p = parentOf(diagram, attrId)
  return !!p && isAttributeNode(p) && p.isComposite
}

export const subAttrNotKeyRule: ValidationRule = {
  id: 'chen.attribute.sub-not-key',
  severity: 'error',
  category: 'attribute',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const a of nodesByKind(diagram, 'attribute')) {
      if (a.isKey && isSubAttribute(diagram, a.id)) {
        out.push(err('chen.attribute.sub-not-key', a.id, 'validation.chen.attribute.sub-not-key'))
      }
    }
    return out
  },
}

export const subAttrNotDiscriminantRule: ValidationRule = {
  id: 'chen.attribute.sub-not-discriminant',
  severity: 'error',
  category: 'attribute',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const a of nodesByKind(diagram, 'attribute')) {
      if (a.isDiscriminant && isSubAttribute(diagram, a.id)) {
        out.push(err('chen.attribute.sub-not-discriminant', a.id, 'validation.chen.attribute.sub-not-discriminant'))
      }
    }
    return out
  },
}

export const subAttrNotCompositeRule: ValidationRule = {
  id: 'chen.attribute.sub-not-composite',
  severity: 'error',
  category: 'attribute',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const a of nodesByKind(diagram, 'attribute')) {
      if (a.isComposite && isSubAttribute(diagram, a.id)) {
        out.push(err('chen.attribute.sub-not-composite', a.id, 'validation.chen.attribute.sub-not-composite'))
      }
    }
    return out
  },
}

export const attributeRules: readonly ValidationRule[] = [
  attributeSingleParentRule,
  attributeNoDualParentRule,
  discriminantWeakOnlyRule,
  attributeNotKeyAndDerivedRule,
  keyNotMultivaluedRule,
  discriminantNotMultivaluedRule,
  relationshipAttributeNotKeyRule,
  attributeNameUniqueRule,
  compositeNeedsSubRule,
  subAttrNotKeyRule,
  subAttrNotDiscriminantRule,
  subAttrNotCompositeRule,
] as const
```

- [ ] **Step 4: Run tests**

Run: `pnpm test -- src/notation/chen/rules/attribute.test.ts`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/notation/chen/rules/attribute.ts src/notation/chen/rules/attribute.test.ts
git commit -F /tmp/phase1-task10-msg.txt
```

`/tmp/phase1-task10-msg.txt`:

```
feat(notation/chen): add attribute validation rules (12)

Ports 3.1-3.12 from legacy. Name-uniqueness scope is per-parent
and wired into the main flow. Composite-attribute sub-attribute
rules (3.9-3.12) cover the nesting model.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

---

## Task 11: Generalization Rules (3)

**Files:**
- Create: `src/notation/chen/rules/generalization.ts`
- Create: `src/notation/chen/rules/generalization.test.ts`

Rule ids:

| ID | Severity | Summary |
|---|---|---|
| `chen.generalization.parent-exists` | error | ISA has exactly one parent ISAEdge (and the referenced entity exists). |
| `chen.generalization.has-children` | error | ISA has ≥1 child. |
| `chen.generalization.single-child-warning` | warning | ISA with a single child — semantic nudge. |

- [ ] **Step 1: Write the failing tests**

Create `src/notation/chen/rules/generalization.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  isaParentExistsRule,
  isaHasChildrenRule,
  isaSingleChildWarningRule,
  generalizationRules,
} from './generalization'
import { makeDiagram } from '@fixtures/diagrams/makeDiagram'
import { makeEntity, makeIsa } from '@fixtures/diagrams/makeNode'
import { makeIsaEdge } from '@fixtures/diagrams/makeEdge'
import { isaHierarchy } from '@fixtures/diagrams/composed'

describe('isaParentExistsRule', () => {
  it('fires for ISA without a parent edge', () => {
    const c = makeEntity({ name: 'Child' })
    const i = makeIsa()
    const d = makeDiagram([c, i], [makeIsaEdge(i.id, c.id, 'child')])
    expect(isaParentExistsRule.check(d).map((e) => e.targetId)).toContain(i.id)
  })

  it('does not fire on a healthy ISA hierarchy', () => {
    expect(isaParentExistsRule.check(isaHierarchy())).toEqual([])
  })
})

describe('isaHasChildrenRule', () => {
  it('fires for ISA without child edges', () => {
    const p = makeEntity({ name: 'Parent' })
    const i = makeIsa()
    const d = makeDiagram([p, i], [makeIsaEdge(p.id, i.id, 'parent')])
    expect(isaHasChildrenRule.check(d).map((e) => e.targetId)).toContain(i.id)
  })

  it('does not fire on a healthy ISA', () => {
    expect(isaHasChildrenRule.check(isaHierarchy())).toEqual([])
  })
})

describe('isaSingleChildWarningRule', () => {
  it('fires when ISA has exactly one child', () => {
    const p = makeEntity({ name: 'Parent' })
    const c1 = makeEntity({ name: 'C1' })
    const i = makeIsa()
    const d = makeDiagram([p, c1, i], [
      makeIsaEdge(p.id, i.id, 'parent'),
      makeIsaEdge(i.id, c1.id, 'child'),
    ])
    const errs = isaSingleChildWarningRule.check(d)
    expect(errs.map((e) => e.targetId)).toContain(i.id)
    expect(errs[0]?.severity).toBe('warning')
  })

  it('does not fire when ISA has ≥2 children', () => {
    expect(isaSingleChildWarningRule.check(isaHierarchy())).toEqual([])
  })
})

describe('generalizationRules barrel', () => {
  it('exports exactly 3 rules', () => {
    expect(generalizationRules).toHaveLength(3)
  })

  it('every rule id is unique and prefixed chen.generalization.*', () => {
    const ids = generalizationRules.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => id.startsWith('chen.generalization.'))).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/notation/chen/rules/generalization.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/notation/chen/rules/generalization.ts`:

```ts
import type { Diagram, NodeId, ISAEdge } from '@/domain/types'
import { incidentEdges, isIsaEdge, nodesByKind } from '@/domain/graph'
import type { ValidationError, ValidationRule } from '@/notation/types'

const isaEdgesOf = (diagram: Diagram, isaId: NodeId): readonly ISAEdge[] =>
  incidentEdges(diagram, isaId).filter(isIsaEdge)

const parentEdges = (diagram: Diagram, isaId: NodeId): readonly ISAEdge[] =>
  isaEdgesOf(diagram, isaId).filter((e) => e.role === 'parent' && e.targetId === isaId)

const childEdges = (diagram: Diagram, isaId: NodeId): readonly ISAEdge[] =>
  isaEdgesOf(diagram, isaId).filter((e) => e.role === 'child' && e.sourceId === isaId)

const err = (
  ruleId: string, targetId: NodeId, messageKey: string,
  severity: 'error' | 'warning' = 'error',
): ValidationError => ({ ruleId, severity, targetId, messageKey })

export const isaParentExistsRule: ValidationRule = {
  id: 'chen.generalization.parent-exists',
  severity: 'error',
  category: 'generalization',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const isa of nodesByKind(diagram, 'isa')) {
      const parents = parentEdges(diagram, isa.id)
      if (parents.length !== 1 || !diagram.nodesById[parents[0]!.sourceId]) {
        out.push(err('chen.generalization.parent-exists', isa.id, 'validation.chen.generalization.parent-exists'))
      }
    }
    return out
  },
}

export const isaHasChildrenRule: ValidationRule = {
  id: 'chen.generalization.has-children',
  severity: 'error',
  category: 'generalization',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const isa of nodesByKind(diagram, 'isa')) {
      if (childEdges(diagram, isa.id).length === 0) {
        out.push(err('chen.generalization.has-children', isa.id, 'validation.chen.generalization.has-children'))
      }
    }
    return out
  },
}

export const isaSingleChildWarningRule: ValidationRule = {
  id: 'chen.generalization.single-child-warning',
  severity: 'warning',
  category: 'generalization',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const isa of nodesByKind(diagram, 'isa')) {
      if (childEdges(diagram, isa.id).length === 1) {
        out.push(err(
          'chen.generalization.single-child-warning', isa.id,
          'validation.chen.generalization.single-child-warning',
          'warning',
        ))
      }
    }
    return out
  },
}

export const generalizationRules: readonly ValidationRule[] = [
  isaParentExistsRule,
  isaHasChildrenRule,
  isaSingleChildWarningRule,
] as const
```

- [ ] **Step 4: Run tests**

Run: `pnpm test -- src/notation/chen/rules/generalization.test.ts`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/notation/chen/rules/generalization.ts src/notation/chen/rules/generalization.test.ts
git commit -F /tmp/phase1-task11-msg.txt
```

`/tmp/phase1-task11-msg.txt`:

```
feat(notation/chen): add generalization validation rules (3)

Simplified from legacy's 6 rules to the 3 canonical ones that
match the new data model (parent-exists, has-children, single-
child-warning). Legacy self-parent/dup-child rules are unreachable
states under ISAEdge discriminated unions.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

---

## Task 12: Structural Rule + Rules Barrel + validateChen()

**Files:**
- Create: `src/notation/chen/rules/structural.ts`
- Create: `src/notation/chen/rules/structural.test.ts`
- Create: `src/notation/chen/rules/index.ts`
- Create: `src/notation/chen/rules/index.test.ts`

- [ ] **Step 1: Write the structural test**

Create `src/notation/chen/rules/structural.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { danglingEdgeRule, structuralRules } from './structural'
import { makeDiagram } from '@fixtures/diagrams/makeDiagram'
import { makeEntity } from '@fixtures/diagrams/makeNode'
import { makeEREdge } from '@fixtures/diagrams/makeEdge'
import { asNodeId } from '@/domain/id'
import { strongEntityWithKey } from '@fixtures/diagrams/composed'

describe('danglingEdgeRule', () => {
  it('fires when an edge references a missing node', () => {
    const e = makeEntity({ name: 'X' })
    const missing = asNodeId('missing__1')
    const d = makeDiagram([e], [makeEREdge(e.id, missing)])
    expect(danglingEdgeRule.check(d).length).toBeGreaterThan(0)
  })

  it('does not fire on a healthy diagram', () => {
    expect(danglingEdgeRule.check(strongEntityWithKey())).toEqual([])
  })
})

describe('structuralRules barrel', () => {
  it('exports exactly 1 rule', () => {
    expect(structuralRules).toHaveLength(1)
  })

  it('every rule id is unique and prefixed chen.structural.*', () => {
    const ids = structuralRules.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => id.startsWith('chen.structural.'))).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/notation/chen/rules/structural.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write structural rule**

Create `src/notation/chen/rules/structural.ts`:

```ts
import type { ValidationError, ValidationRule } from '@/notation/types'

export const danglingEdgeRule: ValidationRule = {
  id: 'chen.structural.dangling-edge',
  severity: 'error',
  category: 'structural',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const edgeId of diagram.edgeOrder) {
      const edge = diagram.edgesById[edgeId]
      if (!edge) continue
      if (!diagram.nodesById[edge.sourceId] || !diagram.nodesById[edge.targetId]) {
        out.push({
          ruleId: 'chen.structural.dangling-edge',
          severity: 'error',
          targetId: edge.id,
          messageKey: 'validation.chen.structural.dangling-edge',
        })
      }
    }
    return out
  },
}

export const structuralRules: readonly ValidationRule[] = [danglingEdgeRule] as const
```

- [ ] **Step 4: Run structural tests**

Run: `pnpm test -- src/notation/chen/rules/structural.test.ts`
Expected: all tests pass.

- [ ] **Step 5: Write the barrel + validateChen()**

Create `src/notation/chen/rules/index.ts`:

```ts
import type { Diagram } from '@/domain/types'
import type { ValidationError, ValidationRule } from '@/notation/types'
import { entityRules } from './entity'
import { relationshipRules } from './relationship'
import { attributeRules } from './attribute'
import { generalizationRules } from './generalization'
import { structuralRules } from './structural'

export const chenRules: readonly ValidationRule[] = [
  ...entityRules,
  ...relationshipRules,
  ...attributeRules,
  ...generalizationRules,
  ...structuralRules,
] as const

export const validateChen = (diagram: Diagram): readonly ValidationError[] => {
  const errors: ValidationError[] = []
  for (const rule of chenRules) {
    for (const e of rule.check(diagram)) errors.push(e)
  }
  return errors
}

export {
  entityRules,
  relationshipRules,
  attributeRules,
  generalizationRules,
  structuralRules,
}
```

- [ ] **Step 6: Write the integration test**

Create `src/notation/chen/rules/index.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { chenRules, validateChen } from './index'
import { emptyDiagram } from '@/domain/types'
import {
  strongEntityWithKey, weakEntityWithDiscriminant, naryRelationship,
  recursiveRelationship, isaHierarchy, compositeAttribute,
} from '@fixtures/diagrams/composed'

describe('chenRules', () => {
  it('exports exactly 33 rules', () => {
    expect(chenRules).toHaveLength(33)
  })

  it('every rule id is unique', () => {
    const ids = chenRules.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every rule id starts with chen.<category>.', () => {
    for (const rule of chenRules) {
      expect(rule.id).toMatch(new RegExp(`^chen\\.${rule.category}\\.`))
    }
  })

  it('every rule has a messageKey-able shape (structural smoke)', () => {
    for (const rule of chenRules) {
      expect(typeof rule.check).toBe('function')
      expect(['error', 'warning']).toContain(rule.severity)
    }
  })
})

describe('validateChen on canonical fixtures', () => {
  it('empty diagram: no errors', () => {
    expect(validateChen(emptyDiagram())).toEqual([])
  })

  it('strongEntityWithKey: no errors (except orphan-warning for the Student with no relationships)', () => {
    const errs = validateChen(strongEntityWithKey())
    // Only acceptable finding is the orphan-warning for Student (no relationships).
    expect(errs.map((e) => e.ruleId)).toEqual(['chen.entity.orphan-warning'])
  })

  it('weakEntityWithDiscriminant: no errors', () => {
    expect(validateChen(weakEntityWithDiscriminant())).toEqual([])
  })

  it('naryRelationship: only orphan-warnings (these entities have no attributes)', () => {
    const errs = validateChen(naryRelationship())
    const ids = errs.map((e) => e.ruleId)
    // n-ary has 3 entities with no attributes → 3 must-have-key + 3 must-have-attribute.
    expect(ids.filter((id) => id === 'chen.entity.must-have-attribute')).toHaveLength(3)
    expect(ids.filter((id) => id === 'chen.entity.must-have-key')).toHaveLength(3)
  })

  it('recursiveRelationship: no errors', () => {
    expect(validateChen(recursiveRelationship())).toEqual([])
  })

  it('isaHierarchy: no errors', () => {
    expect(validateChen(isaHierarchy())).toEqual([])
  })

  it('compositeAttribute: only orphan-warning (Person has no relationships in this fixture)', () => {
    const errs = validateChen(compositeAttribute())
    expect(errs.map((e) => e.ruleId)).toEqual(['chen.entity.orphan-warning'])
  })
})

describe('validateChen rule-id coverage', () => {
  it('aggregates exactly the sum of category rule counts', () => {
    // 10 + 7 + 12 + 3 + 1 = 33
    const categoryCounts = chenRules.reduce<Record<string, number>>((acc, r) => {
      acc[r.category] = (acc[r.category] ?? 0) + 1
      return acc
    }, {})
    expect(categoryCounts).toEqual({
      entity: 10,
      relationship: 7,
      attribute: 12,
      generalization: 3,
      structural: 1,
    })
  })
})
```

- [ ] **Step 7: Run all tests**

Run: `pnpm test`
Expected: all tests pass (domain + fixtures + all rule categories + barrel).

- [ ] **Step 8: Commit**

```bash
git add src/notation/chen/rules/structural.ts src/notation/chen/rules/structural.test.ts \
        src/notation/chen/rules/index.ts src/notation/chen/rules/index.test.ts
git commit -F /tmp/phase1-task12-msg.txt
```

`/tmp/phase1-task12-msg.txt`:

```
feat(notation/chen): add structural rule, rules barrel, validateChen()

Single structural rule catches dangling edge references (replaces
legacy connection rules 4.1-4.3 now that edges are type-safe
discriminated unions). Barrel aggregates 33 Chen rules and exposes
validateChen() as the entry point for the Phase 2 subscriber.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

---

## Task 13: Coverage Thresholds

**Files:**
- Modify: `vitest.config.ts`

- [ ] **Step 1: Add coverage thresholds**

Edit `vitest.config.ts` — replace the `coverage` block with:

```ts
coverage: {
  provider: 'v8',
  reporter: ['text', 'html'],
  exclude: ['src/legacy/**', '**/*.test.{ts,tsx}', '**/.gitkeep', 'tests/**'],
  thresholds: {
    'src/domain/**': {
      statements: 95,
      branches: 90,
      functions: 95,
      lines: 95,
    },
    'src/notation/chen/rules/**': {
      statements: 90,
      branches: 85,
      functions: 90,
      lines: 90,
    },
  },
},
```

Keep `provider: 'v8'` and the existing `reporter` + `exclude` values.

- [ ] **Step 2: Run coverage**

Run: `pnpm test:coverage`
Expected: all thresholds met.

If a file falls below the threshold, add the missing positive/negative tests to that file's test suite before moving on. Do not lower the thresholds — lowering them defeats the purpose. Do not add tests that assert nothing just to hit coverage.

- [ ] **Step 3: Commit**

```bash
git add vitest.config.ts
git commit -F /tmp/phase1-task13-msg.txt
```

`/tmp/phase1-task13-msg.txt`:

```
test: enforce ≥95% domain and ≥90% chen-rules coverage

Per spec §8.8 thresholds. Any file below threshold fails CI
(locally via pnpm test:coverage). Phase 2+ will add its own
layer thresholds.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

---

## Task 14: Final Verification

**Files:** (none — read-only pass)

- [ ] **Step 1: Run the whole suite**

Run: `pnpm lint`
Expected: 0 errors, no new warnings. Layer-boundary rules pass (domain imports from nowhere; notation imports only from `@/domain` and `@/notation`).

Run: `pnpm typecheck`
Expected: clean.

Run: `pnpm test`
Expected: all tests pass.

Run: `pnpm test:coverage`
Expected: thresholds met.

Run: `pnpm build`
Expected: clean production build. The blank-canvas app still boots since `src/app/` is untouched and `ERCanvas.tsx` was not modified.

- [ ] **Step 2: Verify atomicity targets**

Every new `.ts`/`.tsx` file should be under 350 lines (spec §8.1 warn threshold). Check with:

Run: `wc -l src/domain/*.ts src/notation/types.ts src/notation/chen/rules/*.ts`
Expected: no file >350 lines. If a category file exceeds, split it (e.g., split `attribute.ts` into `attribute-basic.ts` + `attribute-composite.ts`) and update the barrel.

- [ ] **Step 3: Verify layer boundaries are respected**

Run: `pnpm lint`
Expected: no `no-restricted-imports` violations. Confirm manually that:
- `src/domain/**` has no imports from `@/state`, `@/interaction`, `@/notation`, `@/canvas`, `@/ui`, `@/platform`, `@/app`.
- `src/notation/**` has no imports from `@/state`, `@/interaction`, `@/canvas`, `@/ui`, `@/app`.
- No Phase 1 file imports React, Zustand, React Flow, or XState.

If any layer violation or unwanted import is found: fix it now before committing.

- [ ] **Step 4: Verify the exit criteria explicitly**

Confirm each from the spec §10.3 exit list:

- `pnpm test` green.
- Coverage shows ≥95% in `src/domain/**` and ≥90% in `src/notation/chen/rules/**`.
- `pnpm typecheck`, `pnpm lint`, `pnpm build` green.
- `src/app/` still empty — the subscriber wiring is Phase 2.
- `src/canvas/ERCanvas.tsx` untouched — rendering is Phase 4.
- Every rule has ≥1 positive and ≥1 negative test.
- Every invariant has ≥1 positive and ≥1 negative test.
- Every geometry/graph utility has parametric tests (normal inputs + edge cases).

- [ ] **Step 5: Commit nothing (verification only)**

This task produces no artifacts. If any check failed, return to the relevant earlier task and fix the root cause before marking this task done.

---

## Task 15: CHANGELOG entry + PR-ready summary

**Files:**
- Modify (or create): `CHANGELOG.md` — prepend a Phase 1 entry

- [ ] **Step 1: Check for existing CHANGELOG**

Run: `ls CHANGELOG.md 2>/dev/null || echo "not present"`

If missing, create it:

```markdown
# Changelog

All notable changes to this project will be documented in this file.

## [v2 / Phase 1] — 2026-04-22

### Added
- Pure domain layer: `Diagram` indexed container, `ERNode` / `ERLink` discriminated unions, branded `NodeId` / `EdgeId`, geometry and graph utilities (`src/domain/`).
- 9 structural invariants (`src/domain/invariants.ts`) as pure predicates returning `InvariantViolation[]`.
- Chen validation catalog: 33 rules across entity (10), relationship (7), attribute (12), generalization (3), structural (1) categories, each a pure `(Diagram) => ValidationError[]`.
- English + Italian (English-fallback) i18n message bundles for all 33 rule keys.
- Diagram fixture factories in `tests/fixtures/diagrams/` + `@fixtures` vitest alias.
- Coverage thresholds: ≥95% in `src/domain/**`, ≥90% in `src/notation/chen/rules/**`.

### Notes
- No React, Zustand, XState, or React Flow imports in any Phase 1 file.
- `src/canvas/ERCanvas.tsx` and `src/app/` intentionally untouched — Phase 2 (state) and Phase 4 (rendering) own those changes.
```

If present, prepend the same block above existing entries.

- [ ] **Step 2: Commit**

```bash
git add CHANGELOG.md
git commit -F /tmp/phase1-task15-msg.txt
```

`/tmp/phase1-task15-msg.txt`:

```
docs: changelog entry for Phase 1

Domain layer + Chen validation rules (33 total) + i18n bundles
+ test fixtures + coverage thresholds.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

---

## Post-plan notes (for the controller)

- Phase 1 does **not** push to remote. The user opens the PR when ready.
- If the SUPSI Java XML fixture arrives during Phase 1, do **not** wire it in — it lands in Phase 5. Drop it in `tests/fixtures/supsi/` unchanged and keep going.
- Phase 2 (state) will consume `validateChen()` from `@/notation/chen/rules`. Keep the barrel export stable.
- Any future-notation plugin (Crow's Foot, UML) implements its own rules/*.ts and exports a sibling `validateCrowsFoot()` / etc.

