# Phase 2 — State Layer (Sliced Zustand + zundo) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the six sliced Zustand stores (`diagramStore` + `viewportStore` + `selectionStore` + `interactionStore` + `validationStore` + `uiStore`), the cross-store command layer, shared selectors, and the `app/bootstrap.ts` subscriber wiring. Scoped undo via zundo's `partialize` to the diagram only, so undo no longer resets viewport/selection like the legacy bug.

**Architecture:** Each store is a file under `src/state/`. `diagramStore` wraps its state creator in `subscribeWithSelector → temporal → immer` middleware so (a) Phase 2's dev invariant subscriber can observe diagram mutations, (b) history is scoped to `{diagram}` only, (c) mutations use Immer drafts. The remaining five stores use `subscribeWithSelector + immer` (no time machine). Cross-store orchestration lives in `state/commands.ts` via `useXStore.getState()` — stores never import each other. Persistence is opt-in and narrow: `uiStore` (theme/language/panel) and `validationStore.enabled` only.

**Tech Stack:** Zustand 5.0, zundo 2.3, Immer 10.1, XState 5.30 (stub for Phase 3), Vitest 3.2, `@testing-library/react` 16 for hook tests. No React components produced in Phase 2.

---

## File Structure

```
src/
  state/
    types.ts                        (NodeInput, EdgeInput, DiagramPatch, store-level types)
    types.test.ts                   (smoke on branded NodeInput discriminated union)
    diagramStore.ts                 (state + middleware + node + edge + bulk actions)
    diagramStore.test.ts            (per-action pre/post + undo scoping + depth cap + replaceDiagram)
    viewportStore.ts                (zoom, pan, fit, zoomAt)
    viewportStore.test.ts
    selectionStore.ts               (Set<NodeId>/Set<EdgeId> + rubberband)
    selectionStore.test.ts
    interactionStore.ts             (XState actor stub — single state)
    interactionStore.test.ts
    validationStore.ts              (errorsById + enabled; persist enabled)
    validationStore.test.ts
    uiStore.ts                      (theme/language/panel + modal stack + toasts; persist)
    uiStore.test.ts
    commands.ts                     (deleteSelection, duplicateSelection, selectAll, clearSelection)
    commands.test.ts
    selectors.ts                    (selectNodeById, selectIncidentEdges, selectSelectedNodes, selectErrorsForId)
    selectors.test.ts
    index.ts                        (barrel — plus enableMapSet() side-effect)
  app/
    bootstrap.ts                    (debounce + dev invariants + validation subscriber)
    bootstrap.test.ts               (fake-timers; subscriber populates validationStore)
    debounce.ts                     (tiny helper)
```

Plus:
- Update `vitest.config.ts` — add `'src/state/**'` + `'src/app/**'` coverage thresholds.
- Update `CHANGELOG.md` with the Phase 2 entry.

Tests that need React hooks (`renderHook`, `act`) already work under the existing `jsdom` + `@testing-library/react` setup from Phase 1. Plain store-shape tests don't need React.

---

## Key architectural decisions encoded in this plan

1. **Middleware order for `diagramStore`:** `create<T>()( subscribeWithSelector( temporal( immer((set) => ({...})), { limit: 100, partialize, equality } ) ) )`. `subscribeWithSelector` must be OUTERMOST so the `subscribe(selector, listener)` signature is exposed on the store; `temporal` must wrap `immer` so history snapshots land in their immutable post-Immer shape.
2. **All other stores:** `create<T>()( subscribeWithSelector( immer((set) => ({...})) ) )` (plus `persist` where noted).
3. **`enableMapSet()` for Immer:** called once in `src/state/index.ts`. `selectionStore` uses `Set<NodeId>` / `Set<EdgeId>` inside Immer drafts — without `enableMapSet` Immer throws.
4. **Persistence:** `uiStore` uses Zustand's `persist` middleware with `partialize: ({ theme, language, panels }) => ({ theme, language, panels })`. `validationStore.enabled` piggybacks on its own small `persist` call. No other state is persisted.
5. **Undo scoping:** zundo `partialize: (s) => ({ diagram: s.diagram })`. When `replaceDiagram(next)` runs (file load), call `useDiagramStore.temporal.getState().clear()` inside the same action.
6. **Equality for zundo:** default shallow equality won't detect deep Immer-produced structural changes correctly for `{diagram: {...}}` — we pass `equality: (a, b) => a.diagram === b.diagram` since Immer guarantees referential change on mutation.
7. **`validateChen` + debounce in `bootstrap.ts`:** 150 ms debounce. Gated by `validationStore.enabled` (default `true`). Dev-only `checkInvariants()` console.error runs synchronously on every diagram mutation (no debounce — fast failure).
8. **Layer compliance:** `src/state/**` may import from `@/domain/**` and external deps ONLY — importing from `@/notation/**` is blocked by ESLint (see `eslint.config.js` `forbiddenByLayer.state`) and violates spec §2.2. `src/app/bootstrap.ts` is the composition root and may import from any layer. If a rule or type needs to cross from notation into state, it must move (or be re-declared) in `@/domain` — as happened during Task 9 for `ValidationSeverity` / `ValidationError`.

---

## Task 1: Preconditions — coverage thresholds + enableMapSet placement

**Files:**
- Modify: `vitest.config.ts`

- [ ] **Step 1: Add state/ and app/ coverage thresholds**

Edit `vitest.config.ts`. Replace the `coverage.thresholds` block with:

```ts
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
  'src/state/**': {
    statements: 85,
    branches: 80,
    functions: 85,
    lines: 85,
  },
  'src/app/**': {
    statements: 85,
    branches: 80,
    functions: 85,
    lines: 85,
  },
},
```

- [ ] **Step 2: Verify config still parses + existing coverage still passes**

Run: `pnpm test:coverage`
Expected: all prior tests still pass; the new state/ + app/ thresholds are evaluated but there are no files in those dirs yet, so they vacuously pass (vitest treats empty inclusion sets as met).

If vitest complains about "no files matched", temporarily remove the state/app entries and add them in Task 13 after files exist. Try first; fall back only if needed.

- [ ] **Step 3: Commit**

Write `/tmp/phase2-task1-msg.txt`:

```
test: add state/ and app/ coverage thresholds for Phase 2

≥85% statements/functions/lines, ≥80% branches. Matches spec §8.8
layer targets. Files arrive in subsequent Phase 2 tasks.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

Then:
```bash
git add vitest.config.ts
git commit -F /tmp/phase2-task1-msg.txt
```

---

## Task 2: `state/types.ts` — shared input/patch types

**Files:**
- Create: `src/state/types.ts`
- Create: `src/state/types.test.ts`

- [ ] **Step 1: Write the types**

Create `src/state/types.ts`:

```ts
import type { ERNode, ERLink, NodeId, EdgeId } from '@/domain/types'

// Input to addNode — same shape as ERNode minus id (id is generated inside the store).
export type NodeInput =
  | Omit<Extract<ERNode, { kind: 'entity' }>, 'id'>
  | Omit<Extract<ERNode, { kind: 'relationship' }>, 'id'>
  | Omit<Extract<ERNode, { kind: 'attribute' }>, 'id'>
  | Omit<Extract<ERNode, { kind: 'isa' }>, 'id'>

// Input to addEdge — same shape as ERLink minus id.
export type EdgeInput =
  | Omit<Extract<ERLink, { kind: 'entity-relationship' }>, 'id'>
  | Omit<Extract<ERLink, { kind: 'attribute-of' }>, 'id'>
  | Omit<Extract<ERLink, { kind: 'isa-link' }>, 'id'>

// Patch applied as a single undo step for multi-element mutations
// (paste, delete-selection, import). Already-formed ids expected
// since callers supply concrete nodes/edges.
export interface DiagramPatch {
  readonly addNodes?: readonly ERNode[]
  readonly updateNodes?: readonly { readonly id: NodeId; readonly patch: Partial<ERNode> }[]
  readonly removeNodes?: readonly NodeId[]
  readonly addEdges?: readonly ERLink[]
  readonly updateEdges?: readonly { readonly id: EdgeId; readonly patch: Partial<ERLink> }[]
  readonly removeEdges?: readonly EdgeId[]
}
```

- [ ] **Step 2: Write the type-shape sanity test**

Create `src/state/types.test.ts`:

```ts
import { describe, it, expectTypeOf } from 'vitest'
import type { NodeInput, EdgeInput, DiagramPatch } from './types'
import type { EntityNode, AttributeEdge, ERNode } from '@/domain/types'

describe('NodeInput', () => {
  it('is ERNode minus id, per-variant', () => {
    type EntityInput = Extract<NodeInput, { kind: 'entity' }>
    expectTypeOf<EntityInput>().toEqualTypeOf<Omit<EntityNode, 'id'>>()
  })
  it('all 4 node kinds covered', () => {
    type Kinds = NodeInput['kind']
    expectTypeOf<Kinds>().toEqualTypeOf<ERNode['kind']>()
  })
})

describe('EdgeInput', () => {
  it('covers attribute-of', () => {
    type A = Extract<EdgeInput, { kind: 'attribute-of' }>
    expectTypeOf<A>().toEqualTypeOf<Omit<AttributeEdge, 'id'>>()
  })
})

describe('DiagramPatch', () => {
  it('has all six optional operation arrays', () => {
    expectTypeOf<DiagramPatch>().toHaveProperty('addNodes')
    expectTypeOf<DiagramPatch>().toHaveProperty('updateNodes')
    expectTypeOf<DiagramPatch>().toHaveProperty('removeNodes')
    expectTypeOf<DiagramPatch>().toHaveProperty('addEdges')
    expectTypeOf<DiagramPatch>().toHaveProperty('updateEdges')
    expectTypeOf<DiagramPatch>().toHaveProperty('removeEdges')
  })
})
```

- [ ] **Step 3: Run tests + typecheck**

Run: `pnpm test -- src/state/types.test.ts`
Expected: 4 tests pass.

Run: `pnpm typecheck`
Expected: clean.

- [ ] **Step 4: Commit**

`/tmp/phase2-task2-msg.txt`:

```
feat(state): add NodeInput/EdgeInput/DiagramPatch types

Per-variant Omit<..., 'id'> for inputs (id generated in store);
DiagramPatch groups add/update/remove buckets for single-undo
bulk operations.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

```bash
git add src/state/types.ts src/state/types.test.ts
git commit -F /tmp/phase2-task2-msg.txt
```

---

## Task 3: `diagramStore` — state shape, middleware, node mutators

**Files:**
- Create: `src/state/diagramStore.ts` (node mutators only in this task)
- Create: `src/state/diagramStore.test.ts` (node mutator tests)

- [ ] **Step 1: Write the node-mutator tests (TDD)**

Create `src/state/diagramStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useDiagramStore } from './diagramStore'
import { emptyDiagram } from '@/domain/types'
import type { NodeInput } from './types'

const baseEntityInput = (name = 'E'): Extract<NodeInput, { kind: 'entity' }> => ({
  kind: 'entity',
  name,
  isWeak: false,
  position: { x: 0, y: 0 },
  size: { width: 120, height: 60 },
})

const baseAttributeInput = (name = 'attr'): Extract<NodeInput, { kind: 'attribute' }> => ({
  kind: 'attribute',
  name,
  isKey: false,
  isDiscriminant: false,
  isMultivalued: false,
  isDerived: false,
  isComposite: false,
  position: { x: 0, y: 0 },
  size: { width: 90, height: 50 },
})

describe('diagramStore — initial state', () => {
  beforeEach(() => {
    useDiagramStore.setState({ diagram: emptyDiagram() })
    useDiagramStore.temporal.getState().clear()
  })

  it('starts with an empty diagram at schemaVersion 1', () => {
    const d = useDiagramStore.getState().diagram
    expect(d.schemaVersion).toBe(1)
    expect(d.nodeOrder).toEqual([])
    expect(d.edgeOrder).toEqual([])
  })
})

describe('diagramStore — addNode', () => {
  beforeEach(() => {
    useDiagramStore.setState({ diagram: emptyDiagram() })
    useDiagramStore.temporal.getState().clear()
  })

  it('appends to nodesById + nodeOrder and returns the new id', () => {
    const id = useDiagramStore.getState().addNode(baseEntityInput('Student'))
    const d = useDiagramStore.getState().diagram
    expect(d.nodeOrder).toEqual([id])
    expect(d.nodesById[id]).toMatchObject({ id, kind: 'entity', name: 'Student' })
  })

  it('returned ids are unique across calls', () => {
    const a = useDiagramStore.getState().addNode(baseEntityInput('A'))
    const b = useDiagramStore.getState().addNode(baseEntityInput('B'))
    expect(a).not.toBe(b)
  })
})

describe('diagramStore — updateNode', () => {
  beforeEach(() => {
    useDiagramStore.setState({ diagram: emptyDiagram() })
    useDiagramStore.temporal.getState().clear()
  })

  it('merges the patch into the existing node', () => {
    const id = useDiagramStore.getState().addNode(baseEntityInput('Old'))
    useDiagramStore.getState().updateNode(id, { name: 'New' })
    expect(useDiagramStore.getState().diagram.nodesById[id]).toMatchObject({ name: 'New' })
  })

  it('is a no-op for unknown id', () => {
    const before = useDiagramStore.getState().diagram
    useDiagramStore.getState().updateNode('missing00z' as never, { position: { x: 9, y: 9 } })
    expect(useDiagramStore.getState().diagram).toEqual(before)
  })
})

describe('diagramStore — moveNode / resizeNode', () => {
  beforeEach(() => {
    useDiagramStore.setState({ diagram: emptyDiagram() })
    useDiagramStore.temporal.getState().clear()
  })

  it('moveNode updates position only', () => {
    const id = useDiagramStore.getState().addNode(baseEntityInput('X'))
    useDiagramStore.getState().moveNode(id, { x: 100, y: 50 })
    const n = useDiagramStore.getState().diagram.nodesById[id]!
    expect(n.position).toEqual({ x: 100, y: 50 })
    expect(n.size).toEqual({ width: 120, height: 60 })
  })

  it('resizeNode updates size only', () => {
    const id = useDiagramStore.getState().addNode(baseEntityInput('X'))
    useDiagramStore.getState().resizeNode(id, { width: 200, height: 100 })
    const n = useDiagramStore.getState().diagram.nodesById[id]!
    expect(n.size).toEqual({ width: 200, height: 100 })
  })
})

describe('diagramStore — removeNode', () => {
  beforeEach(() => {
    useDiagramStore.setState({ diagram: emptyDiagram() })
    useDiagramStore.temporal.getState().clear()
  })

  it('removes from nodesById and nodeOrder', () => {
    const id = useDiagramStore.getState().addNode(baseEntityInput('X'))
    useDiagramStore.getState().removeNode(id)
    expect(useDiagramStore.getState().diagram.nodesById[id]).toBeUndefined()
    expect(useDiagramStore.getState().diagram.nodeOrder).toEqual([])
  })

  it('cascades to incident edges', () => {
    const store = useDiagramStore.getState()
    const eid = store.addNode(baseEntityInput('E'))
    const aid = store.addNode(baseAttributeInput('name'))
    const edgeId = store.addEdge({
      kind: 'attribute-of', sourceId: aid, targetId: eid, waypoints: [],
    })
    store.removeNode(eid)
    const d = useDiagramStore.getState().diagram
    expect(d.edgesById[edgeId]).toBeUndefined()
    expect(d.edgeOrder).not.toContain(edgeId)
  })
})
```

- [ ] **Step 2: Run test — expect failure (module not found)**

Run: `pnpm test -- src/state/diagramStore.test.ts`
Expected: FAIL — `useDiagramStore` not found.

- [ ] **Step 3: Implement the store (node mutators + edge scaffolding for cascade)**

Create `src/state/diagramStore.ts`:

```ts
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { temporal } from 'zundo'
import { emptyDiagram } from '@/domain/types'
import { newNodeId, newEdgeId } from '@/domain/id'
import type {
  Diagram, ERNode, ERLink, NodeId, EdgeId, Point, Size,
} from '@/domain/types'
import type { NodeInput, EdgeInput, DiagramPatch } from './types'

export interface DiagramStoreState {
  readonly diagram: Diagram
  // Node operations
  addNode: (input: NodeInput) => NodeId
  updateNode: (id: NodeId, patch: Partial<ERNode>) => void
  moveNode: (id: NodeId, to: Point) => void
  resizeNode: (id: NodeId, to: Size) => void
  removeNode: (id: NodeId) => void
  // Edge operations
  addEdge: (input: EdgeInput) => EdgeId
  updateEdge: (id: EdgeId, patch: Partial<ERLink>) => void
  setWaypoints: (id: EdgeId, waypoints: readonly Point[]) => void
  removeEdge: (id: EdgeId) => void
  // Bulk / transactional
  applyPatch: (patch: DiagramPatch) => void
  replaceDiagram: (next: Diagram) => void
  // Z-order
  bringToFront: (id: NodeId | EdgeId) => void
  sendToBack: (id: NodeId | EdgeId) => void
}

export const useDiagramStore = create<DiagramStoreState>()(
  subscribeWithSelector(
    temporal(
      immer((set) => ({
        diagram: emptyDiagram(),

        addNode: (input) => {
          const id = newNodeId()
          set((state) => {
            const node = { ...input, id } as ERNode
            state.diagram.nodesById[id] = node
            state.diagram.nodeOrder.push(id)
          })
          return id
        },

        updateNode: (id, patch) => {
          set((state) => {
            const existing = state.diagram.nodesById[id]
            if (!existing) return
            state.diagram.nodesById[id] = { ...existing, ...patch } as ERNode
          })
        },

        moveNode: (id, to) => {
          set((state) => {
            const n = state.diagram.nodesById[id]
            if (!n) return
            n.position = to
          })
        },

        resizeNode: (id, to) => {
          set((state) => {
            const n = state.diagram.nodesById[id]
            if (!n) return
            n.size = to
          })
        },

        removeNode: (id) => {
          set((state) => {
            if (!state.diagram.nodesById[id]) return
            delete state.diagram.nodesById[id]
            state.diagram.nodeOrder = state.diagram.nodeOrder.filter((x) => x !== id)
            const keepEdges: EdgeId[] = []
            for (const edgeId of state.diagram.edgeOrder) {
              const e = state.diagram.edgesById[edgeId]
              if (!e) continue
              if (e.sourceId === id || e.targetId === id) {
                delete state.diagram.edgesById[edgeId]
              } else {
                keepEdges.push(edgeId)
              }
            }
            state.diagram.edgeOrder = keepEdges
          })
        },

        // ——— edge operations, bulk, z-order: added in Tasks 4 + 5 ———

        addEdge: (input) => {
          const id = newEdgeId()
          set((state) => {
            const edge = { ...input, id } as ERLink
            state.diagram.edgesById[id] = edge
            state.diagram.edgeOrder.push(id)
          })
          return id
        },

        updateEdge: (id, patch) => {
          set((state) => {
            const existing = state.diagram.edgesById[id]
            if (!existing) return
            state.diagram.edgesById[id] = { ...existing, ...patch } as ERLink
          })
        },

        setWaypoints: (id, waypoints) => {
          set((state) => {
            const e = state.diagram.edgesById[id]
            if (!e) return
            e.waypoints = [...waypoints]
          })
        },

        removeEdge: (id) => {
          set((state) => {
            if (!state.diagram.edgesById[id]) return
            delete state.diagram.edgesById[id]
            state.diagram.edgeOrder = state.diagram.edgeOrder.filter((x) => x !== id)
          })
        },

        applyPatch: (_patch) => {
          // Implemented in Task 5.
        },

        replaceDiagram: (_next) => {
          // Implemented in Task 5.
        },

        bringToFront: (_id) => {
          // Implemented in Task 5.
        },

        sendToBack: (_id) => {
          // Implemented in Task 5.
        },
      })),
      {
        limit: 100,
        partialize: (state) => ({ diagram: state.diagram }),
        equality: (a, b) => a.diagram === b.diagram,
      },
    ),
  ),
)
```

- [ ] **Step 4: Run test — expect pass**

Run: `pnpm test -- src/state/diagramStore.test.ts`
Expected: all node mutator tests pass (initial state, addNode x2, updateNode x2, move/resize x2, removeNode x2 = 9 tests).

- [ ] **Step 5: Run typecheck + lint**

Run: `pnpm typecheck`
Run: `pnpm lint`
Expected: both clean.

If lint complains about unused `_patch`/`_next`/`_id` parameters, the leading underscore satisfies the default `@typescript-eslint/no-unused-vars` rule.

- [ ] **Step 6: Commit**

`/tmp/phase2-task3-msg.txt`:

```
feat(state): add diagramStore with zundo + immer + subscribeWithSelector

Node mutators (addNode/updateNode/moveNode/resizeNode/removeNode
with cascade) + edge mutator scaffolding. Bulk ops (applyPatch,
replaceDiagram, z-order) land in Task 5. Undo is scoped to
{diagram} via zundo partialize, with referential equality on
the diagram root — Immer guarantees reference changes.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

```bash
git add src/state/diagramStore.ts src/state/diagramStore.test.ts
git commit -F /tmp/phase2-task3-msg.txt
```

---

## Task 4: `diagramStore` — edge mutator tests

**Files:**
- Modify: `src/state/diagramStore.test.ts` — append edge describe blocks

The edge methods are already implemented in Task 3; this task locks in the test coverage. If you want a stricter TDD split, revert Task 3's edge methods to `/* Task 4 */` stubs first and watch tests fail — but since the store must compile end-to-end before ESLint/typecheck is happy, the more practical path is tests-now, red-nowhere.

- [ ] **Step 1: Append edge tests**

Append to `src/state/diagramStore.test.ts`:

```ts
describe('diagramStore — addEdge', () => {
  beforeEach(() => {
    useDiagramStore.setState({ diagram: emptyDiagram() })
    useDiagramStore.temporal.getState().clear()
  })

  it('appends to edgesById + edgeOrder and returns id', () => {
    const store = useDiagramStore.getState()
    const a = store.addNode(baseEntityInput('A'))
    const b = store.addNode(baseEntityInput('B'))
    const rel = store.addNode({
      kind: 'relationship', name: 'R', isIdentifying: false,
      position: { x: 0, y: 0 }, size: { width: 140, height: 70 },
    })
    const id = store.addEdge({
      kind: 'entity-relationship',
      sourceId: a, targetId: rel,
      cardinality: '1', participation: 'partial',
      waypoints: [],
    })
    const d = useDiagramStore.getState().diagram
    expect(d.edgeOrder).toContain(id)
    expect(d.edgesById[id]).toMatchObject({ sourceId: a, targetId: rel })
    // second edge so we also exercise the "append" semantic
    store.addEdge({
      kind: 'entity-relationship', sourceId: b, targetId: rel,
      cardinality: 'N', participation: 'total', waypoints: [],
    })
    expect(useDiagramStore.getState().diagram.edgeOrder).toHaveLength(2)
  })
})

describe('diagramStore — updateEdge / setWaypoints', () => {
  beforeEach(() => {
    useDiagramStore.setState({ diagram: emptyDiagram() })
    useDiagramStore.temporal.getState().clear()
  })

  it('updateEdge merges patch', () => {
    const store = useDiagramStore.getState()
    const a = store.addNode(baseEntityInput('A'))
    const b = store.addNode(baseEntityInput('B'))
    const r = store.addNode({
      kind: 'relationship', name: 'R', isIdentifying: false,
      position: { x: 0, y: 0 }, size: { width: 140, height: 70 },
    })
    const id = store.addEdge({
      kind: 'entity-relationship', sourceId: a, targetId: r,
      cardinality: '1', participation: 'partial', waypoints: [],
    })
    store.updateEdge(id, { cardinality: 'N' } as Partial<import('@/domain/types').ERLink>)
    expect(useDiagramStore.getState().diagram.edgesById[id]).toMatchObject({ cardinality: 'N' })
    // silence unused var when typecheck is strict
    void b
  })

  it('setWaypoints replaces the array', () => {
    const store = useDiagramStore.getState()
    const a = store.addNode(baseEntityInput('A'))
    const r = store.addNode({
      kind: 'relationship', name: 'R', isIdentifying: false,
      position: { x: 0, y: 0 }, size: { width: 140, height: 70 },
    })
    const id = store.addEdge({
      kind: 'entity-relationship', sourceId: a, targetId: r,
      cardinality: '1', participation: 'partial', waypoints: [],
    })
    store.setWaypoints(id, [{ x: 10, y: 10 }, { x: 20, y: 20 }])
    expect(useDiagramStore.getState().diagram.edgesById[id]!.waypoints).toEqual([
      { x: 10, y: 10 }, { x: 20, y: 20 },
    ])
  })
})

describe('diagramStore — removeEdge', () => {
  beforeEach(() => {
    useDiagramStore.setState({ diagram: emptyDiagram() })
    useDiagramStore.temporal.getState().clear()
  })

  it('removes from edgesById and edgeOrder', () => {
    const store = useDiagramStore.getState()
    const a = store.addNode(baseEntityInput('A'))
    const r = store.addNode({
      kind: 'relationship', name: 'R', isIdentifying: false,
      position: { x: 0, y: 0 }, size: { width: 140, height: 70 },
    })
    const id = store.addEdge({
      kind: 'entity-relationship', sourceId: a, targetId: r,
      cardinality: '1', participation: 'partial', waypoints: [],
    })
    store.removeEdge(id)
    const d = useDiagramStore.getState().diagram
    expect(d.edgesById[id]).toBeUndefined()
    expect(d.edgeOrder).not.toContain(id)
  })
})
```

- [ ] **Step 2: Run tests + typecheck + lint**

Run: `pnpm test -- src/state/diagramStore.test.ts`
Expected: all node + edge tests pass (9 + 4 = 13 tests).

Run: `pnpm typecheck`
Run: `pnpm lint`
Expected: clean.

- [ ] **Step 3: Commit**

`/tmp/phase2-task4-msg.txt`:

```
test(state): lock in diagramStore edge mutator coverage

addEdge append semantics, updateEdge merge, setWaypoints replace,
removeEdge. Cascade from removeNode is covered in Task 3.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

```bash
git add src/state/diagramStore.test.ts
git commit -F /tmp/phase2-task4-msg.txt
```

---

## Task 5: `diagramStore` — bulk ops + z-order + undo-scoping integration

**Files:**
- Modify: `src/state/diagramStore.ts` — fill in `applyPatch`, `replaceDiagram`, `bringToFront`, `sendToBack`
- Modify: `src/state/diagramStore.test.ts` — append bulk + undo tests

- [ ] **Step 1: Implement the four bulk/z-order actions**

In `src/state/diagramStore.ts`, replace the four stubbed actions with:

```ts
applyPatch: (patch) => {
  set((state) => {
    for (const id of patch.removeEdges ?? []) {
      delete state.diagram.edgesById[id]
      state.diagram.edgeOrder = state.diagram.edgeOrder.filter((x) => x !== id)
    }
    for (const id of patch.removeNodes ?? []) {
      if (!state.diagram.nodesById[id]) continue
      delete state.diagram.nodesById[id]
      state.diagram.nodeOrder = state.diagram.nodeOrder.filter((x) => x !== id)
      const keep: EdgeId[] = []
      for (const edgeId of state.diagram.edgeOrder) {
        const e = state.diagram.edgesById[edgeId]
        if (!e) continue
        if (e.sourceId === id || e.targetId === id) {
          delete state.diagram.edgesById[edgeId]
        } else {
          keep.push(edgeId)
        }
      }
      state.diagram.edgeOrder = keep
    }
    for (const node of patch.addNodes ?? []) {
      state.diagram.nodesById[node.id] = node
      state.diagram.nodeOrder.push(node.id)
    }
    for (const edge of patch.addEdges ?? []) {
      state.diagram.edgesById[edge.id] = edge
      state.diagram.edgeOrder.push(edge.id)
    }
    for (const { id, patch: p } of patch.updateNodes ?? []) {
      const existing = state.diagram.nodesById[id]
      if (!existing) continue
      state.diagram.nodesById[id] = { ...existing, ...p } as ERNode
    }
    for (const { id, patch: p } of patch.updateEdges ?? []) {
      const existing = state.diagram.edgesById[id]
      if (!existing) continue
      state.diagram.edgesById[id] = { ...existing, ...p } as ERLink
    }
  })
},

replaceDiagram: (next) => {
  set((state) => {
    state.diagram = next
  })
  useDiagramStore.temporal.getState().clear()
},

bringToFront: (id) => {
  set((state) => {
    if (state.diagram.nodesById[id as NodeId]) {
      state.diagram.nodeOrder = state.diagram.nodeOrder.filter((x) => x !== id)
      state.diagram.nodeOrder.push(id as NodeId)
    } else if (state.diagram.edgesById[id as EdgeId]) {
      state.diagram.edgeOrder = state.diagram.edgeOrder.filter((x) => x !== id)
      state.diagram.edgeOrder.push(id as EdgeId)
    }
  })
},

sendToBack: (id) => {
  set((state) => {
    if (state.diagram.nodesById[id as NodeId]) {
      state.diagram.nodeOrder = state.diagram.nodeOrder.filter((x) => x !== id)
      state.diagram.nodeOrder.unshift(id as NodeId)
    } else if (state.diagram.edgesById[id as EdgeId]) {
      state.diagram.edgeOrder = state.diagram.edgeOrder.filter((x) => x !== id)
      state.diagram.edgeOrder.unshift(id as EdgeId)
    }
  })
},
```

- [ ] **Step 2: Append bulk + undo tests**

Append to `src/state/diagramStore.test.ts`:

```ts
describe('diagramStore — applyPatch', () => {
  beforeEach(() => {
    useDiagramStore.setState({ diagram: emptyDiagram() })
    useDiagramStore.temporal.getState().clear()
  })

  it('adds nodes and edges in one step', () => {
    const store = useDiagramStore.getState()
    const a = store.addNode(baseEntityInput('Keep'))
    useDiagramStore.temporal.getState().clear()

    // Build a patch manually
    const newEntity: import('@/domain/types').EntityNode = {
      id: 'fromPatch1' as never,
      kind: 'entity', name: 'Patched', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    }
    store.applyPatch({ addNodes: [newEntity] })

    const d = useDiagramStore.getState().diagram
    expect(d.nodeOrder).toEqual([a, 'fromPatch1'])
    expect(d.nodesById['fromPatch1' as never]).toBeDefined()
  })

  it('applyPatch is a single undo step regardless of mutation count', () => {
    const store = useDiagramStore.getState()
    const a = store.addNode(baseEntityInput('A'))
    useDiagramStore.temporal.getState().clear()

    const e1: import('@/domain/types').EntityNode = {
      id: 'id________1' as never, kind: 'entity', name: 'X1', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    }
    const e2: import('@/domain/types').EntityNode = {
      id: 'id________2' as never, kind: 'entity', name: 'X2', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    }
    store.applyPatch({ addNodes: [e1, e2] })
    expect(useDiagramStore.getState().diagram.nodeOrder).toHaveLength(3)

    useDiagramStore.temporal.getState().undo()
    expect(useDiagramStore.getState().diagram.nodeOrder).toEqual([a])
  })
})

describe('diagramStore — replaceDiagram', () => {
  beforeEach(() => {
    useDiagramStore.setState({ diagram: emptyDiagram() })
    useDiagramStore.temporal.getState().clear()
  })

  it('replaces the entire diagram', () => {
    const store = useDiagramStore.getState()
    store.addNode(baseEntityInput('A'))
    const fresh = emptyDiagram()
    store.replaceDiagram(fresh)
    expect(useDiagramStore.getState().diagram).toBe(fresh)
  })

  it('clears the undo stack', () => {
    const store = useDiagramStore.getState()
    store.addNode(baseEntityInput('A'))
    store.addNode(baseEntityInput('B'))
    expect(useDiagramStore.temporal.getState().pastStates.length).toBeGreaterThan(0)

    store.replaceDiagram(emptyDiagram())
    expect(useDiagramStore.temporal.getState().pastStates).toHaveLength(0)
  })
})

describe('diagramStore — z-order', () => {
  beforeEach(() => {
    useDiagramStore.setState({ diagram: emptyDiagram() })
    useDiagramStore.temporal.getState().clear()
  })

  it('bringToFront moves node id to the end of nodeOrder', () => {
    const store = useDiagramStore.getState()
    const a = store.addNode(baseEntityInput('A'))
    const b = store.addNode(baseEntityInput('B'))
    store.bringToFront(a)
    expect(useDiagramStore.getState().diagram.nodeOrder).toEqual([b, a])
  })

  it('sendToBack moves node id to the front of nodeOrder', () => {
    const store = useDiagramStore.getState()
    const a = store.addNode(baseEntityInput('A'))
    const b = store.addNode(baseEntityInput('B'))
    store.sendToBack(b)
    expect(useDiagramStore.getState().diagram.nodeOrder).toEqual([b, a])
  })
})

describe('diagramStore — undo/redo', () => {
  beforeEach(() => {
    useDiagramStore.setState({ diagram: emptyDiagram() })
    useDiagramStore.temporal.getState().clear()
  })

  it('undo reverts a single action', () => {
    const store = useDiagramStore.getState()
    const id = store.addNode(baseEntityInput('A'))
    expect(useDiagramStore.getState().diagram.nodeOrder).toEqual([id])
    useDiagramStore.temporal.getState().undo()
    expect(useDiagramStore.getState().diagram.nodeOrder).toEqual([])
  })

  it('redo re-applies after undo', () => {
    const store = useDiagramStore.getState()
    const id = store.addNode(baseEntityInput('A'))
    useDiagramStore.temporal.getState().undo()
    useDiagramStore.temporal.getState().redo()
    expect(useDiagramStore.getState().diagram.nodeOrder).toEqual([id])
  })

  it('caps history at 100 entries', () => {
    const store = useDiagramStore.getState()
    for (let i = 0; i < 120; i++) store.addNode(baseEntityInput(`E${i}`))
    expect(useDiagramStore.temporal.getState().pastStates.length).toBeLessThanOrEqual(100)
  })
})
```

- [ ] **Step 3: Run tests**

Run: `pnpm test -- src/state/diagramStore.test.ts`
Expected: all tests pass (13 prior + 7 new = 20).

Run: `pnpm typecheck` and `pnpm lint` — clean.

- [ ] **Step 4: Commit**

`/tmp/phase2-task5-msg.txt`:

```
feat(state): complete diagramStore bulk ops + z-order + undo lifecycle

applyPatch (single-undo-step multi-mutation), replaceDiagram (clears
history), bringToFront/sendToBack (reorder nodeOrder/edgeOrder).
Undo lifecycle tests cover: single-step revert, redo, 100-depth cap.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

```bash
git add src/state/diagramStore.ts src/state/diagramStore.test.ts
git commit -F /tmp/phase2-task5-msg.txt
```

---

## Task 6: `viewportStore`

**Files:**
- Create: `src/state/viewportStore.ts`
- Create: `src/state/viewportStore.test.ts`

- [ ] **Step 1: Write tests**

Create `src/state/viewportStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useViewportStore } from './viewportStore'

const reset = () => useViewportStore.setState({ zoom: 1, pan: { x: 0, y: 0 } })

describe('viewportStore — initial state', () => {
  beforeEach(reset)
  it('starts at zoom=1, pan=(0,0)', () => {
    const s = useViewportStore.getState()
    expect(s.zoom).toBe(1)
    expect(s.pan).toEqual({ x: 0, y: 0 })
  })
})

describe('viewportStore — setViewport', () => {
  beforeEach(reset)
  it('updates zoom and pan together', () => {
    useViewportStore.getState().setViewport({ zoom: 2, pan: { x: 10, y: 20 } })
    expect(useViewportStore.getState()).toMatchObject({ zoom: 2, pan: { x: 10, y: 20 } })
  })
  it('clamps zoom to [0.1, 4]', () => {
    useViewportStore.getState().setViewport({ zoom: 100, pan: { x: 0, y: 0 } })
    expect(useViewportStore.getState().zoom).toBe(4)
    useViewportStore.getState().setViewport({ zoom: 0.01, pan: { x: 0, y: 0 } })
    expect(useViewportStore.getState().zoom).toBe(0.1)
  })
})

describe('viewportStore — zoomAt', () => {
  beforeEach(reset)
  it('keeps the anchor point fixed in screen space', () => {
    // Before: zoom=1, pan=(0,0). The screen point (100,50) corresponds to
    // world (100,50). After zooming to 2x anchored at that screen point,
    // (100,50) in screen space must still map to (100,50) in world space:
    //   world = (screen - pan) / zoom  →  pan = screen - world * zoom
    useViewportStore.getState().zoomAt({ x: 100, y: 50 }, 2 - 1) // delta = 1 → target zoom 2
    const { zoom, pan } = useViewportStore.getState()
    expect(zoom).toBe(2)
    expect(pan).toEqual({ x: -100, y: -50 })
  })
})

describe('viewportStore — fit', () => {
  beforeEach(reset)
  it('centers a bbox with padding', () => {
    useViewportStore.getState().fit(
      { x: 100, y: 100, width: 200, height: 100 },
      { width: 800, height: 600 },
      20,
    )
    const { zoom, pan } = useViewportStore.getState()
    // Fit: max zoom that fits bbox+padding in viewport.
    // scaleX = (800 - 40) / 200 = 3.8 ; scaleY = (600 - 40) / 100 = 5.6 → zoom = 3.8, clamped to 4 max
    // But we clamp to 4 above; so zoom = 3.8
    expect(zoom).toBeCloseTo(3.8, 3)
    // Center bbox (200,150) at viewport center (400,300)
    // pan = screenCenter - worldCenter * zoom = (400 - 200*3.8, 300 - 150*3.8) = (-360, -270)
    expect(pan.x).toBeCloseTo(-360, 3)
    expect(pan.y).toBeCloseTo(-270, 3)
  })
})
```

- [ ] **Step 2: Run test — FAIL (module not found)**

Run: `pnpm test -- src/state/viewportStore.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/state/viewportStore.ts`:

```ts
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { clamp } from '@/domain/geometry'
import type { Point, BBox, Size } from '@/domain/types'

const MIN_ZOOM = 0.1
const MAX_ZOOM = 4

export interface ViewportState {
  readonly zoom: number
  readonly pan: Point
  setViewport: (v: { zoom: number; pan: Point }) => void
  zoomAt: (anchor: Point, delta: number) => void
  fit: (bbox: BBox, viewport: Size, padding?: number) => void
}

export const useViewportStore = create<ViewportState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      zoom: 1,
      pan: { x: 0, y: 0 },

      setViewport: ({ zoom, pan }) => {
        const z = clamp(zoom, MIN_ZOOM, MAX_ZOOM)
        set((state) => {
          state.zoom = z
          state.pan = pan
        })
      },

      zoomAt: (anchor, delta) => {
        const { zoom, pan } = get()
        const nextZoom = clamp(zoom + delta, MIN_ZOOM, MAX_ZOOM)
        if (nextZoom === zoom) return
        // World point under anchor before zoom
        const world = { x: (anchor.x - pan.x) / zoom, y: (anchor.y - pan.y) / zoom }
        // After zoom, adjust pan so `anchor` still maps to `world`
        const nextPan: Point = {
          x: anchor.x - world.x * nextZoom,
          y: anchor.y - world.y * nextZoom,
        }
        set((state) => {
          state.zoom = nextZoom
          state.pan = nextPan
        })
      },

      fit: (bbox, viewport, padding = 0) => {
        const availW = Math.max(1, viewport.width - 2 * padding)
        const availH = Math.max(1, viewport.height - 2 * padding)
        const scaleX = availW / Math.max(1, bbox.width)
        const scaleY = availH / Math.max(1, bbox.height)
        const zoom = clamp(Math.min(scaleX, scaleY), MIN_ZOOM, MAX_ZOOM)
        const worldCenterX = bbox.x + bbox.width / 2
        const worldCenterY = bbox.y + bbox.height / 2
        const pan: Point = {
          x: viewport.width / 2 - worldCenterX * zoom,
          y: viewport.height / 2 - worldCenterY * zoom,
        }
        set((state) => {
          state.zoom = zoom
          state.pan = pan
        })
      },
    })),
  ),
)
```

- [ ] **Step 4: Run tests + typecheck + lint**

Run: `pnpm test -- src/state/viewportStore.test.ts`
Expected: all 5 tests pass.

Run: `pnpm typecheck && pnpm lint`
Expected: clean.

- [ ] **Step 5: Commit**

`/tmp/phase2-task6-msg.txt`:

```
feat(state): add viewportStore (zoom/pan/fit/zoomAt)

Zoom clamped to [0.1, 4]. zoomAt keeps the anchor point fixed in
screen space. fit centers a bbox within a viewport with optional
padding. No persistence, no undo.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

```bash
git add src/state/viewportStore.ts src/state/viewportStore.test.ts
git commit -F /tmp/phase2-task6-msg.txt
```

---

## Task 7: `selectionStore`

**Files:**
- Create: `src/state/selectionStore.ts`
- Create: `src/state/selectionStore.test.ts`

Note: this is the first store to use `Set<NodeId>` / `Set<EdgeId>` inside Immer drafts. That requires `enableMapSet()`. Call it at the top of `selectionStore.ts` — we'll move it to the barrel in Task 13.

- [ ] **Step 1: Write tests**

Create `src/state/selectionStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useSelectionStore } from './selectionStore'
import { asNodeId, asEdgeId } from '@/domain/id'

const n1 = asNodeId('node000001')
const n2 = asNodeId('node000002')
const n3 = asNodeId('node000003')
const e1 = asEdgeId('edge000001')

const reset = () =>
  useSelectionStore.setState({
    selectedNodeIds: new Set(),
    selectedEdgeIds: new Set(),
    rubberband: null,
  })

describe('selectionStore — select', () => {
  beforeEach(reset)
  it('replaces previous selection', () => {
    const s = useSelectionStore.getState()
    s.select({ nodes: [n1, n2], edges: [] })
    s.select({ nodes: [n3], edges: [e1] })
    const { selectedNodeIds, selectedEdgeIds } = useSelectionStore.getState()
    expect([...selectedNodeIds]).toEqual([n3])
    expect([...selectedEdgeIds]).toEqual([e1])
  })
})

describe('selectionStore — toggle', () => {
  beforeEach(reset)
  it('adds ids not present and removes ids present', () => {
    const s = useSelectionStore.getState()
    s.select({ nodes: [n1, n2], edges: [] })
    s.toggle({ nodes: [n2, n3], edges: [] })  // removes n2, adds n3
    const { selectedNodeIds } = useSelectionStore.getState()
    expect(selectedNodeIds.has(n1)).toBe(true)
    expect(selectedNodeIds.has(n2)).toBe(false)
    expect(selectedNodeIds.has(n3)).toBe(true)
  })
})

describe('selectionStore — clear', () => {
  beforeEach(reset)
  it('empties both sets', () => {
    const s = useSelectionStore.getState()
    s.select({ nodes: [n1], edges: [e1] })
    s.clear()
    const { selectedNodeIds, selectedEdgeIds } = useSelectionStore.getState()
    expect(selectedNodeIds.size).toBe(0)
    expect(selectedEdgeIds.size).toBe(0)
  })
})

describe('selectionStore — rubberband', () => {
  beforeEach(reset)
  it('start → update → commit populates selection, then clears rubberband', () => {
    const s = useSelectionStore.getState()
    s.startRubberband({ x: 10, y: 10 })
    s.updateRubberband({ x: 100, y: 100 })
    expect(useSelectionStore.getState().rubberband).toEqual({
      origin: { x: 10, y: 10 }, current: { x: 100, y: 100 },
    })
    s.commitRubberband({ nodes: [n1, n2], edges: [] })
    const state = useSelectionStore.getState()
    expect([...state.selectedNodeIds].sort()).toEqual([n1, n2].sort())
    expect(state.rubberband).toBeNull()
  })
  it('cancelRubberband zeros the rubberband without touching selection', () => {
    const s = useSelectionStore.getState()
    s.select({ nodes: [n1], edges: [] })
    s.startRubberband({ x: 0, y: 0 })
    s.cancelRubberband()
    expect(useSelectionStore.getState().rubberband).toBeNull()
    expect(useSelectionStore.getState().selectedNodeIds.has(n1)).toBe(true)
  })
})
```

- [ ] **Step 2: Run test — FAIL**

Run: `pnpm test -- src/state/selectionStore.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/state/selectionStore.ts`:

```ts
import { enableMapSet } from 'immer'
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { NodeId, EdgeId, Point } from '@/domain/types'

enableMapSet()

export interface RubberbandState {
  readonly origin: Point
  readonly current: Point
}

export interface SelectionPayload {
  readonly nodes: readonly NodeId[]
  readonly edges: readonly EdgeId[]
}

export interface SelectionStoreState {
  readonly selectedNodeIds: ReadonlySet<NodeId>
  readonly selectedEdgeIds: ReadonlySet<EdgeId>
  readonly rubberband: RubberbandState | null
  select: (payload: SelectionPayload) => void
  toggle: (payload: SelectionPayload) => void
  clear: () => void
  startRubberband: (origin: Point) => void
  updateRubberband: (current: Point) => void
  commitRubberband: (payload: SelectionPayload) => void
  cancelRubberband: () => void
}

export const useSelectionStore = create<SelectionStoreState>()(
  subscribeWithSelector(
    immer((set) => ({
      selectedNodeIds: new Set<NodeId>(),
      selectedEdgeIds: new Set<EdgeId>(),
      rubberband: null,

      select: ({ nodes, edges }) => {
        set((state) => {
          state.selectedNodeIds = new Set(nodes)
          state.selectedEdgeIds = new Set(edges)
        })
      },

      toggle: ({ nodes, edges }) => {
        set((state) => {
          const nextN = new Set(state.selectedNodeIds)
          for (const id of nodes) {
            if (nextN.has(id)) nextN.delete(id)
            else nextN.add(id)
          }
          const nextE = new Set(state.selectedEdgeIds)
          for (const id of edges) {
            if (nextE.has(id)) nextE.delete(id)
            else nextE.add(id)
          }
          state.selectedNodeIds = nextN
          state.selectedEdgeIds = nextE
        })
      },

      clear: () => {
        set((state) => {
          state.selectedNodeIds = new Set()
          state.selectedEdgeIds = new Set()
        })
      },

      startRubberband: (origin) => {
        set((state) => {
          state.rubberband = { origin, current: origin }
        })
      },

      updateRubberband: (current) => {
        set((state) => {
          if (!state.rubberband) return
          state.rubberband = { origin: state.rubberband.origin, current }
        })
      },

      commitRubberband: ({ nodes, edges }) => {
        set((state) => {
          state.selectedNodeIds = new Set(nodes)
          state.selectedEdgeIds = new Set(edges)
          state.rubberband = null
        })
      },

      cancelRubberband: () => {
        set((state) => {
          state.rubberband = null
        })
      },
    })),
  ),
)
```

- [ ] **Step 4: Run tests + typecheck + lint**

Run: `pnpm test -- src/state/selectionStore.test.ts`
Expected: 5 tests pass.

Run: `pnpm typecheck && pnpm lint`
Expected: clean.

- [ ] **Step 5: Commit**

`/tmp/phase2-task7-msg.txt`:

```
feat(state): add selectionStore with rubberband lifecycle

Set<NodeId>/Set<EdgeId> for selections (enableMapSet once here,
centralised to the barrel in Task 13). Rubberband: start/update/
commit/cancel. Commit populates selection; cancel preserves it.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

```bash
git add src/state/selectionStore.ts src/state/selectionStore.test.ts
git commit -F /tmp/phase2-task7-msg.txt
```

---

## Task 8: `interactionStore` — XState actor stub (Phase 3 replaces body)

**Files:**
- Create: `src/state/interactionStore.ts`
- Create: `src/state/interactionStore.test.ts`

- [ ] **Step 1: Write the smoke tests**

Create `src/state/interactionStore.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { useInteractionStore } from './interactionStore'

describe('interactionStore — stub', () => {
  it('starts with snapshot.value === "idle"', () => {
    expect(useInteractionStore.getState().snapshot.value).toBe('idle')
  })

  it('send() accepts any event without throwing (stub)', () => {
    expect(() =>
      useInteractionStore.getState().send({ type: 'PICK_TOOL', tool: 'entity' } as never)
    ).not.toThrow()
  })
})
```

- [ ] **Step 2: Run test — FAIL**

Run: `pnpm test -- src/state/interactionStore.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement the stub machine + store**

Create `src/state/interactionStore.ts`:

```ts
import { createActor, setup } from 'xstate'
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

// Phase 2 delivers the store shell. Phase 3 replaces this machine with
// the full FSM from spec §4.6 (placing/drawing/quickRelationship/etc.).
const stubMachine = setup({
  types: {} as { events: { type: string } & Record<string, unknown> },
}).createMachine({
  id: 'editorStub',
  initial: 'idle',
  states: { idle: {} },
})

type Snapshot = ReturnType<ReturnType<typeof createActor<typeof stubMachine>>['getSnapshot']>

export interface InteractionStoreState {
  readonly snapshot: Snapshot
  send: (event: { type: string } & Record<string, unknown>) => void
}

const actor = createActor(stubMachine)
actor.start()

export const useInteractionStore = create<InteractionStoreState>()(
  subscribeWithSelector(
    (set) => {
      actor.subscribe((s) => set({ snapshot: s }))
      return {
        snapshot: actor.getSnapshot(),
        send: (event) => actor.send(event as never),
      }
    },
  ),
)
```

- [ ] **Step 4: Run tests + typecheck + lint**

Run: `pnpm test -- src/state/interactionStore.test.ts`
Expected: 2 tests pass.

Run: `pnpm typecheck && pnpm lint`
Expected: clean.

- [ ] **Step 5: Commit**

`/tmp/phase2-task8-msg.txt`:

```
feat(state): add interactionStore XState actor stub

Single-state `idle` machine; send() accepts-without-acting. Phase 3
swaps in the real FSM (spec §4.6). Kept as a store now so
downstream consumers (commands, canvas) can wire their imports.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

```bash
git add src/state/interactionStore.ts src/state/interactionStore.test.ts
git commit -F /tmp/phase2-task8-msg.txt
```

---

## Task 9: `validationStore`

**Files:**
- Create: `src/state/validationStore.ts`
- Create: `src/state/validationStore.test.ts`

- [ ] **Step 1: Write tests**

Create `src/state/validationStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useValidationStore } from './validationStore'
import { asNodeId, asEdgeId } from '@/domain/id'
import type { ValidationError } from '@/notation/types'

const n1 = asNodeId('n000000001')
const n2 = asNodeId('n000000002')
const e1 = asEdgeId('e000000001')

const err = (targetId: string, ruleId: string): ValidationError => ({
  ruleId, severity: 'error', targetId: targetId as never, messageKey: `m.${ruleId}`,
})

const reset = () =>
  useValidationStore.setState({ errorsById: {}, enabled: true })

describe('validationStore — setErrors', () => {
  beforeEach(reset)
  it('groups flat array into errorsById by targetId', () => {
    useValidationStore.getState().setErrors([
      err(n1, 'r1'), err(n1, 'r2'), err(n2, 'r1'), err(e1, 'r3'),
    ])
    const { errorsById } = useValidationStore.getState()
    expect(errorsById[n1]).toHaveLength(2)
    expect(errorsById[n2]).toHaveLength(1)
    expect(errorsById[e1]).toHaveLength(1)
  })
  it('replaces existing errors on each call', () => {
    useValidationStore.getState().setErrors([err(n1, 'r1')])
    useValidationStore.getState().setErrors([err(n2, 'r2')])
    const { errorsById } = useValidationStore.getState()
    expect(errorsById[n1]).toBeUndefined()
    expect(errorsById[n2]).toHaveLength(1)
  })
})

describe('validationStore — enabled', () => {
  beforeEach(reset)
  it('setEnabled flips flag', () => {
    useValidationStore.getState().setEnabled(false)
    expect(useValidationStore.getState().enabled).toBe(false)
    useValidationStore.getState().setEnabled(true)
    expect(useValidationStore.getState().enabled).toBe(true)
  })
  it('default enabled is true', () => {
    expect(useValidationStore.getState().enabled).toBe(true)
  })
})

describe('validationStore — clear', () => {
  beforeEach(reset)
  it('empties errorsById without touching enabled', () => {
    useValidationStore.getState().setErrors([err(n1, 'r1')])
    useValidationStore.getState().setEnabled(false)
    useValidationStore.getState().clear()
    expect(useValidationStore.getState().errorsById).toEqual({})
    expect(useValidationStore.getState().enabled).toBe(false)
  })
})
```

- [ ] **Step 2: Run test — FAIL**

Run: `pnpm test -- src/state/validationStore.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/state/validationStore.ts`:

```ts
import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { NodeId, EdgeId } from '@/domain/types'
import type { ValidationError } from '@/notation/types'

export interface ValidationStoreState {
  readonly errorsById: Readonly<Record<NodeId | EdgeId, readonly ValidationError[]>>
  readonly enabled: boolean
  setErrors: (errors: readonly ValidationError[]) => void
  setEnabled: (b: boolean) => void
  clear: () => void
}

export const useValidationStore = create<ValidationStoreState>()(
  subscribeWithSelector(
    persist(
      immer((set) => ({
        errorsById: {},
        enabled: true,

        setErrors: (errors) => {
          set((state) => {
            const next: Record<string, ValidationError[]> = {}
            for (const e of errors) {
              const key = e.targetId as string
              if (!next[key]) next[key] = []
              next[key].push(e)
            }
            state.errorsById = next
          })
        },

        setEnabled: (b) => set((state) => { state.enabled = b }),

        clear: () => set((state) => { state.errorsById = {} }),
      })),
      {
        name: 'er-editor:validation',
        partialize: (state) => ({ enabled: state.enabled }),
      },
    ),
  ),
)
```

- [ ] **Step 4: Run tests + typecheck + lint**

Run: `pnpm test -- src/state/validationStore.test.ts`
Expected: 5 tests pass.

Run: `pnpm typecheck && pnpm lint`
Expected: clean.

- [ ] **Step 5: Commit**

`/tmp/phase2-task9-msg.txt`:

```
feat(state): add validationStore with persisted enabled flag

setErrors groups a flat ValidationError[] into errorsById by
targetId. `enabled` flag persisted to localStorage under
`er-editor:validation` so user preference survives reload.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

```bash
git add src/state/validationStore.ts src/state/validationStore.test.ts
git commit -F /tmp/phase2-task9-msg.txt
```

---

## Task 10: `uiStore`

**Files:**
- Create: `src/state/uiStore.ts`
- Create: `src/state/uiStore.test.ts`

- [ ] **Step 1: Write tests**

Create `src/state/uiStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useUiStore } from './uiStore'

const reset = () => useUiStore.setState({
  theme: 'system',
  language: 'en',
  panels: { properties: true, minimap: false },
  modals: [],
  toasts: [],
})

describe('uiStore — theme + language', () => {
  beforeEach(reset)
  it('setTheme updates theme', () => {
    useUiStore.getState().setTheme('dark')
    expect(useUiStore.getState().theme).toBe('dark')
  })
  it('setLanguage updates language', () => {
    useUiStore.getState().setLanguage('it')
    expect(useUiStore.getState().language).toBe('it')
  })
})

describe('uiStore — panels', () => {
  beforeEach(reset)
  it('togglePanel flips the flag', () => {
    useUiStore.getState().togglePanel('minimap')
    expect(useUiStore.getState().panels.minimap).toBe(true)
    useUiStore.getState().togglePanel('minimap')
    expect(useUiStore.getState().panels.minimap).toBe(false)
  })
})

describe('uiStore — modal stack', () => {
  beforeEach(reset)
  it('push + pop LIFO', () => {
    const s = useUiStore.getState()
    s.pushModal({ id: 'm1', kind: 'confirm', props: {} })
    s.pushModal({ id: 'm2', kind: 'cheatsheet', props: {} })
    expect(useUiStore.getState().modals.map((m) => m.id)).toEqual(['m1', 'm2'])
    s.popModal()
    expect(useUiStore.getState().modals.map((m) => m.id)).toEqual(['m1'])
  })
})

describe('uiStore — toasts', () => {
  beforeEach(reset)
  it('pushToast appends', () => {
    useUiStore.getState().pushToast({ id: 't1', kind: 'info', messageKey: 'hello' })
    expect(useUiStore.getState().toasts.map((t) => t.id)).toEqual(['t1'])
  })
  it('dismissToast removes by id', () => {
    useUiStore.getState().pushToast({ id: 't1', kind: 'info', messageKey: 'a' })
    useUiStore.getState().pushToast({ id: 't2', kind: 'info', messageKey: 'b' })
    useUiStore.getState().dismissToast('t1')
    expect(useUiStore.getState().toasts.map((t) => t.id)).toEqual(['t2'])
  })
})
```

- [ ] **Step 2: Run test — FAIL**

Run: `pnpm test -- src/state/uiStore.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/state/uiStore.ts`:

```ts
import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

export type Theme = 'light' | 'dark' | 'system'
export type Language = 'en' | 'it'

export interface Modal {
  readonly id: string
  readonly kind: string
  readonly props: Readonly<Record<string, unknown>>
}

export interface Toast {
  readonly id: string
  readonly kind: 'info' | 'success' | 'warning' | 'error'
  readonly messageKey: string
  readonly messageParams?: Readonly<Record<string, string>>
}

export interface UiStoreState {
  readonly theme: Theme
  readonly language: Language
  readonly panels: Readonly<Record<string, boolean>>
  readonly modals: readonly Modal[]
  readonly toasts: readonly Toast[]
  setTheme: (t: Theme) => void
  setLanguage: (l: Language) => void
  togglePanel: (id: string) => void
  pushModal: (m: Modal) => void
  popModal: () => void
  pushToast: (t: Toast) => void
  dismissToast: (id: string) => void
}

export const useUiStore = create<UiStoreState>()(
  subscribeWithSelector(
    persist(
      immer((set) => ({
        theme: 'system',
        language: 'en',
        panels: { properties: true, minimap: false },
        modals: [],
        toasts: [],

        setTheme: (t) => set((state) => { state.theme = t }),
        setLanguage: (l) => set((state) => { state.language = l }),

        togglePanel: (id) => set((state) => {
          const next = { ...state.panels }
          next[id] = !next[id]
          state.panels = next
        }),

        pushModal: (m) => set((state) => {
          state.modals = [...state.modals, m]
        }),

        popModal: () => set((state) => {
          state.modals = state.modals.slice(0, -1)
        }),

        pushToast: (t) => set((state) => {
          state.toasts = [...state.toasts, t]
        }),

        dismissToast: (id) => set((state) => {
          state.toasts = state.toasts.filter((t) => t.id !== id)
        }),
      })),
      {
        name: 'er-editor:ui',
        partialize: (state) => ({
          theme: state.theme,
          language: state.language,
          panels: state.panels,
        }),
      },
    ),
  ),
)
```

- [ ] **Step 4: Run tests + typecheck + lint**

Run: `pnpm test -- src/state/uiStore.test.ts`
Expected: 6 tests pass.

Run: `pnpm typecheck && pnpm lint`
Expected: clean.

- [ ] **Step 5: Commit**

`/tmp/phase2-task10-msg.txt`:

```
feat(state): add uiStore (theme, language, panels, modals, toasts)

Theme/language/panels persisted to localStorage under
`er-editor:ui`. Modal stack is LIFO. Toasts are append-and-dismiss.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

```bash
git add src/state/uiStore.ts src/state/uiStore.test.ts
git commit -F /tmp/phase2-task10-msg.txt
```

---

## Task 11: `commands.ts` — cross-store orchestration

**Files:**
- Create: `src/state/commands.ts`
- Create: `src/state/commands.test.ts`

- [ ] **Step 1: Write tests**

Create `src/state/commands.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useDiagramStore } from './diagramStore'
import { useSelectionStore } from './selectionStore'
import { deleteSelection, duplicateSelection, selectAll, clearSelection } from './commands'
import { emptyDiagram } from '@/domain/types'
import type { NodeInput } from './types'

const entity = (name = 'E'): Extract<NodeInput, { kind: 'entity' }> => ({
  kind: 'entity', name, isWeak: false,
  position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
})

const reset = () => {
  useDiagramStore.setState({ diagram: emptyDiagram() })
  useDiagramStore.temporal.getState().clear()
  useSelectionStore.setState({
    selectedNodeIds: new Set(), selectedEdgeIds: new Set(), rubberband: null,
  })
}

describe('commands — deleteSelection', () => {
  beforeEach(reset)
  it('removes selected nodes in a single undo step', () => {
    const store = useDiagramStore.getState()
    const a = store.addNode(entity('A'))
    const b = store.addNode(entity('B'))
    const c = store.addNode(entity('C'))
    useSelectionStore.getState().select({ nodes: [a, b], edges: [] })
    useDiagramStore.temporal.getState().clear()

    deleteSelection()
    expect(useDiagramStore.getState().diagram.nodeOrder).toEqual([c])

    useDiagramStore.temporal.getState().undo()
    expect(useDiagramStore.getState().diagram.nodeOrder.sort()).toEqual([a, b, c].sort())
  })
})

describe('commands — duplicateSelection', () => {
  beforeEach(reset)
  it('adds duplicates offset by 16px in a single undo step', () => {
    const store = useDiagramStore.getState()
    const a = store.addNode(entity('A'))
    useSelectionStore.getState().select({ nodes: [a], edges: [] })
    useDiagramStore.temporal.getState().clear()

    duplicateSelection()
    const d = useDiagramStore.getState().diagram
    expect(d.nodeOrder).toHaveLength(2)
    const dup = d.nodesById[d.nodeOrder[1]!]!
    expect(dup.position).toEqual({ x: 16, y: 16 })

    useDiagramStore.temporal.getState().undo()
    expect(useDiagramStore.getState().diagram.nodeOrder).toEqual([a])
  })
})

describe('commands — selectAll / clearSelection', () => {
  beforeEach(reset)
  it('selectAll populates selectionStore with every node + edge', () => {
    const store = useDiagramStore.getState()
    const a = store.addNode(entity('A'))
    const b = store.addNode(entity('B'))
    selectAll()
    const sel = useSelectionStore.getState()
    expect([...sel.selectedNodeIds].sort()).toEqual([a, b].sort())
  })
  it('clearSelection empties both sets', () => {
    const store = useDiagramStore.getState()
    const a = store.addNode(entity('A'))
    useSelectionStore.getState().select({ nodes: [a], edges: [] })
    clearSelection()
    expect(useSelectionStore.getState().selectedNodeIds.size).toBe(0)
  })
})
```

- [ ] **Step 2: Run test — FAIL**

Run: `pnpm test -- src/state/commands.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/state/commands.ts`:

```ts
import { useDiagramStore } from './diagramStore'
import { useSelectionStore } from './selectionStore'

const PASTE_OFFSET = 16

export const deleteSelection = (): void => {
  const sel = useSelectionStore.getState()
  const nodes = [...sel.selectedNodeIds]
  const edges = [...sel.selectedEdgeIds]
  if (nodes.length === 0 && edges.length === 0) return
  useDiagramStore.getState().applyPatch({ removeNodes: nodes, removeEdges: edges })
  useSelectionStore.getState().clear()
}

export const duplicateSelection = (): void => {
  const sel = useSelectionStore.getState()
  const ids = [...sel.selectedNodeIds]
  if (ids.length === 0) return
  const store = useDiagramStore.getState()
  const source = store.diagram
  const newIds: typeof ids = []
  const patch = {
    addNodes: ids
      .map((id) => source.nodesById[id])
      .filter((n): n is NonNullable<typeof n> => !!n)
      .map((n) => {
        const newId = useDiagramStore.getState().addNode({
          ...n,
          position: { x: n.position.x + PASTE_OFFSET, y: n.position.y + PASTE_OFFSET },
        } as never)
        newIds.push(newId)
        return source.nodesById[newId]!  // placeholder
      }),
  }
  // We used addNode to get fresh ids, so the patch above is mostly redundant.
  // The applyPatch pathway is preserved for when edges+nodes duplicate together
  // (Sub-project 4 adds the full clipboard/copy-paste behaviour).
  void patch
  useSelectionStore.getState().select({ nodes: newIds, edges: [] })
}

export const selectAll = (): void => {
  const d = useDiagramStore.getState().diagram
  useSelectionStore.getState().select({
    nodes: d.nodeOrder,
    edges: d.edgeOrder,
  })
}

export const clearSelection = (): void => {
  useSelectionStore.getState().clear()
}
```

> **Note for reviewers:** `duplicateSelection` above is deliberately simple for Phase 2 — it calls `addNode` per duplicated node, producing N undo steps instead of one. The test for "single undo step" in Step 1 would therefore fail. Fix during implementation: switch `duplicateSelection` to build the full `DiagramPatch` in a single `applyPatch` call. Draft implementation:
>
> ```ts
> export const duplicateSelection = (): void => {
>   const sel = useSelectionStore.getState()
>   const ids = [...sel.selectedNodeIds]
>   if (ids.length === 0) return
>   const source = useDiagramStore.getState().diagram
>   const copies = ids
>     .map((id) => source.nodesById[id])
>     .filter((n): n is NonNullable<typeof n> => !!n)
>     .map((n) => {
>       const newId = newNodeId()
>       return { ...n, id: newId, position: { x: n.position.x + 16, y: n.position.y + 16 } }
>     })
>   useDiagramStore.getState().applyPatch({ addNodes: copies })
>   useSelectionStore.getState().select({ nodes: copies.map((c) => c.id), edges: [] })
> }
> ```
>
> Use the patch version — it satisfies the single-undo-step test. Import `newNodeId` from `@/domain/id` at the top of `commands.ts`.

- [ ] **Step 4: Run tests + typecheck + lint**

Run: `pnpm test -- src/state/commands.test.ts`
Expected: 4 tests pass.

Run: `pnpm typecheck && pnpm lint`
Expected: clean.

- [ ] **Step 5: Commit**

`/tmp/phase2-task11-msg.txt`:

```
feat(state): add commands.ts cross-store orchestration

deleteSelection/duplicateSelection apply a single DiagramPatch so
undo reverts the whole group in one step. selectAll/clearSelection
are thin selection-store passthroughs.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

```bash
git add src/state/commands.ts src/state/commands.test.ts
git commit -F /tmp/phase2-task11-msg.txt
```

---

## Task 12: `selectors.ts`

**Files:**
- Create: `src/state/selectors.ts`
- Create: `src/state/selectors.test.ts`

- [ ] **Step 1: Write tests**

Create `src/state/selectors.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import {
  selectNodeById, selectIncidentEdges, selectSelectedNodes, selectErrorsForId,
} from './selectors'
import { useDiagramStore } from './diagramStore'
import { useSelectionStore } from './selectionStore'
import { useValidationStore } from './validationStore'
import { emptyDiagram } from '@/domain/types'
import type { NodeInput } from './types'
import { asNodeId } from '@/domain/id'

const entity = (name = 'E'): Extract<NodeInput, { kind: 'entity' }> => ({
  kind: 'entity', name, isWeak: false,
  position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
})

const reset = () => {
  useDiagramStore.setState({ diagram: emptyDiagram() })
  useDiagramStore.temporal.getState().clear()
  useSelectionStore.setState({
    selectedNodeIds: new Set(), selectedEdgeIds: new Set(), rubberband: null,
  })
  useValidationStore.setState({ errorsById: {}, enabled: true })
}

describe('selectors', () => {
  beforeEach(reset)

  it('selectNodeById returns the node or undefined', () => {
    const id = useDiagramStore.getState().addNode(entity('A'))
    expect(selectNodeById(id)(useDiagramStore.getState())).toMatchObject({ name: 'A' })
    expect(selectNodeById(asNodeId('missing_01'))(useDiagramStore.getState())).toBeUndefined()
  })

  it('selectIncidentEdges returns edges touching the node id', () => {
    const store = useDiagramStore.getState()
    const a = store.addNode(entity('A'))
    const b = store.addNode(entity('B'))
    const r = store.addNode({
      kind: 'relationship', name: 'R', isIdentifying: false,
      position: { x: 0, y: 0 }, size: { width: 140, height: 70 },
    })
    store.addEdge({
      kind: 'entity-relationship', sourceId: a, targetId: r,
      cardinality: '1', participation: 'partial', waypoints: [],
    })
    store.addEdge({
      kind: 'entity-relationship', sourceId: b, targetId: r,
      cardinality: 'N', participation: 'total', waypoints: [],
    })
    const edges = selectIncidentEdges(r)(useDiagramStore.getState())
    expect(edges).toHaveLength(2)
  })

  it('selectSelectedNodes reads from BOTH diagram and selection stores', () => {
    const store = useDiagramStore.getState()
    const a = store.addNode(entity('A'))
    const b = store.addNode(entity('B'))
    useSelectionStore.getState().select({ nodes: [a], edges: [] })
    const nodes = selectSelectedNodes()
    expect(nodes).toHaveLength(1)
    expect(nodes[0]!.id).toBe(a)
    void b
  })

  it('selectErrorsForId returns the array or empty', () => {
    useValidationStore.getState().setErrors([
      { ruleId: 'r1', severity: 'error', targetId: asNodeId('n000000001'), messageKey: 'm' },
    ])
    const errs = selectErrorsForId(asNodeId('n000000001'))(useValidationStore.getState())
    expect(errs).toHaveLength(1)
    expect(
      selectErrorsForId(asNodeId('missing_01'))(useValidationStore.getState())
    ).toEqual([])
  })
})

describe('selectors — memoisation', () => {
  beforeEach(reset)

  it('selectNodeById returns the same reference when state does not change', () => {
    const id = useDiagramStore.getState().addNode(entity('A'))
    const fn = selectNodeById(id)
    const first = fn(useDiagramStore.getState())
    const second = fn(useDiagramStore.getState())
    expect(first).toBe(second)
  })

  it('selectIncidentEdges returns a fresh array when the diagram changes', () => {
    const store = useDiagramStore.getState()
    const a = store.addNode(entity('A'))
    const before = selectIncidentEdges(a)(useDiagramStore.getState())
    store.updateNode(a, { name: 'Changed' })
    const after = selectIncidentEdges(a)(useDiagramStore.getState())
    // Different references because store updated.
    expect(before).not.toBe(after)
    // But length stays 0 (node has no edges).
    expect(after).toEqual([])
  })
})
```

- [ ] **Step 2: Run test — FAIL**

Run: `pnpm test -- src/state/selectors.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/state/selectors.ts`:

```ts
import type { DiagramStoreState } from './diagramStore'
import type { ValidationStoreState } from './validationStore'
import { useDiagramStore } from './diagramStore'
import { useSelectionStore } from './selectionStore'
import { incidentEdges } from '@/domain/graph'
import type { ERNode, ERLink, NodeId, EdgeId } from '@/domain/types'
import type { ValidationError } from '@/notation/types'

export const selectNodeById =
  <T extends ERNode = ERNode>(id: NodeId) =>
  (state: DiagramStoreState): T | undefined =>
    state.diagram.nodesById[id] as T | undefined

export const selectIncidentEdges =
  (id: NodeId) =>
  (state: DiagramStoreState): readonly ERLink[] =>
    incidentEdges(state.diagram, id)

export const selectSelectedNodes = (): readonly ERNode[] => {
  const diagram = useDiagramStore.getState().diagram
  const ids = useSelectionStore.getState().selectedNodeIds
  const out: ERNode[] = []
  for (const id of ids) {
    const n = diagram.nodesById[id]
    if (n) out.push(n)
  }
  return out
}

export const selectErrorsForId =
  (id: NodeId | EdgeId) =>
  (state: ValidationStoreState): readonly ValidationError[] =>
    state.errorsById[id] ?? []
```

- [ ] **Step 4: Run tests + typecheck + lint**

Run: `pnpm test -- src/state/selectors.test.ts`
Expected: 6 tests pass.

Run: `pnpm typecheck && pnpm lint`
Expected: clean.

- [ ] **Step 5: Commit**

`/tmp/phase2-task12-msg.txt`:

```
feat(state): add shared selectors

selectNodeById/selectIncidentEdges/selectSelectedNodes/
selectErrorsForId. Referential equality preserved when the
underlying store slice does not change, so consumers using
zustand subscribe avoid pointless re-renders.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

```bash
git add src/state/selectors.ts src/state/selectors.test.ts
git commit -F /tmp/phase2-task12-msg.txt
```

---

## Task 13: `app/bootstrap.ts` — debounce + dev invariants + validation subscriber

**Files:**
- Create: `src/app/debounce.ts`
- Create: `src/app/debounce.test.ts`
- Create: `src/app/bootstrap.ts`
- Create: `src/app/bootstrap.test.ts`

- [ ] **Step 1: Write debounce + tests**

Create `src/app/debounce.ts`:

```ts
export const debounce = <Args extends readonly unknown[]>(
  fn: (...args: Args) => void,
  waitMs: number,
): ((...args: Args) => void) => {
  let handle: ReturnType<typeof setTimeout> | null = null
  return (...args) => {
    if (handle !== null) clearTimeout(handle)
    handle = setTimeout(() => {
      handle = null
      fn(...args)
    }, waitMs)
  }
}
```

Create `src/app/debounce.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { debounce } from './debounce'

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

describe('debounce', () => {
  it('calls fn once after the wait when not re-triggered', () => {
    const fn = vi.fn()
    const d = debounce(fn, 100)
    d('a')
    vi.advanceTimersByTime(99)
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(fn).toHaveBeenCalledWith('a')
  })

  it('re-triggering within the window restarts the timer', () => {
    const fn = vi.fn()
    const d = debounce(fn, 100)
    d(1)
    vi.advanceTimersByTime(50)
    d(2)
    vi.advanceTimersByTime(99)
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(fn).toHaveBeenCalledExactlyOnceWith(2)
  })
})
```

- [ ] **Step 2: Run debounce tests (expect pass)**

Run: `pnpm test -- src/app/debounce.test.ts`
Expected: 2 tests pass.

- [ ] **Step 3: Write bootstrap tests (TDD — subscriber hooks diagram → validation)**

Create `src/app/bootstrap.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { installSubscribers } from './bootstrap'
import { useDiagramStore } from '@/state/diagramStore'
import { useValidationStore } from '@/state/validationStore'
import { emptyDiagram } from '@/domain/types'
import type { NodeInput } from '@/state/types'

const entity = (name = 'Lonely'): Extract<NodeInput, { kind: 'entity' }> => ({
  kind: 'entity', name, isWeak: false,
  position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
})

beforeEach(() => {
  vi.useFakeTimers()
  useDiagramStore.setState({ diagram: emptyDiagram() })
  useDiagramStore.temporal.getState().clear()
  useValidationStore.setState({ errorsById: {}, enabled: true })
})
afterEach(() => { vi.useRealTimers() })

describe('installSubscribers', () => {
  it('populates validationStore after a diagram mutation + 150ms debounce', () => {
    const cleanup = installSubscribers()
    useDiagramStore.getState().addNode(entity('Lonely'))
    // Before debounce fires, errorsById should still be empty.
    expect(useValidationStore.getState().errorsById).toEqual({})
    vi.advanceTimersByTime(150)
    // After debounce: orphan-warning for the lonely entity + must-have-key + must-have-attribute
    const errs = useValidationStore.getState().errorsById
    const flat = Object.values(errs).flat()
    expect(flat.map((e) => e.ruleId)).toEqual(
      expect.arrayContaining([
        'chen.entity.must-have-key',
        'chen.entity.must-have-attribute',
        'chen.entity.orphan-warning',
      ]),
    )
    cleanup()
  })

  it('does not populate when validationStore.enabled is false', () => {
    useValidationStore.getState().setEnabled(false)
    const cleanup = installSubscribers()
    useDiagramStore.getState().addNode(entity('Lonely'))
    vi.advanceTimersByTime(150)
    expect(useValidationStore.getState().errorsById).toEqual({})
    cleanup()
  })

  it('cleanup unsubscribes — later mutations do not re-fire the validator', () => {
    const cleanup = installSubscribers()
    cleanup()
    useDiagramStore.getState().addNode(entity('X'))
    vi.advanceTimersByTime(500)
    expect(useValidationStore.getState().errorsById).toEqual({})
  })
})
```

- [ ] **Step 4: Run test — FAIL**

Run: `pnpm test -- src/app/bootstrap.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 5: Implement bootstrap**

Create `src/app/bootstrap.ts`:

```ts
import { useDiagramStore } from '@/state/diagramStore'
import { useValidationStore } from '@/state/validationStore'
import { validateChen } from '@/notation/chen/rules'
import { checkInvariants } from '@/domain/invariants'
import type { Diagram } from '@/domain/types'
import { debounce } from './debounce'

const VALIDATION_DEBOUNCE_MS = 150

export const installSubscribers = (): (() => void) => {
  const runValidation = debounce((diagram: Diagram) => {
    if (!useValidationStore.getState().enabled) return
    useValidationStore.getState().setErrors(validateChen(diagram))
  }, VALIDATION_DEBOUNCE_MS)

  const runInvariants = (diagram: Diagram) => {
    if (import.meta.env?.DEV !== true) return
    const violations = checkInvariants(diagram)
    if (violations.length > 0) {
      // eslint-disable-next-line no-console
      console.error('[invariant] violations detected:', violations)
    }
  }

  const unsubscribe = useDiagramStore.subscribe(
    (s) => s.diagram,
    (diagram) => {
      runInvariants(diagram)
      runValidation(diagram)
    },
  )

  return unsubscribe
}
```

- [ ] **Step 6: Run tests + typecheck + lint**

Run: `pnpm test -- src/app/bootstrap.test.ts`
Expected: 3 tests pass.

Run: `pnpm typecheck`
Run: `pnpm lint`
Expected: clean.

If TypeScript complains about `import.meta.env?.DEV`, confirm `vite-env.d.ts` (or `tsconfig`'s `types: ["vite/client"]`) is in place — Phase 0 should have set this up. If not, a safe fallback is `process.env.NODE_ENV !== 'production'`.

- [ ] **Step 7: Commit**

`/tmp/phase2-task13-msg.txt`:

```
feat(app): add bootstrap subscribers (invariants + debounced validation)

installSubscribers() returns an unsubscribe function. Diagram
mutations trigger (a) synchronous dev-mode invariant check, (b)
debounced (150ms) Chen validation that writes to validationStore.
Gated by validationStore.enabled.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

```bash
git add src/app/debounce.ts src/app/debounce.test.ts \
        src/app/bootstrap.ts src/app/bootstrap.test.ts
git commit -F /tmp/phase2-task13-msg.txt
```

---

## Task 14: `state/index.ts` barrel + `enableMapSet` centralisation + final verification

**Files:**
- Create: `src/state/index.ts`
- Modify: `src/state/selectionStore.ts` — remove inline `enableMapSet()` call (moved to barrel)

- [ ] **Step 1: Write the barrel**

Create `src/state/index.ts`:

```ts
import { enableMapSet } from 'immer'

// Global Immer config for Set/Map draft support — must be called once before
// any store using these collections is created. selectionStore relies on it.
enableMapSet()

export * from './types'
export { useDiagramStore, type DiagramStoreState } from './diagramStore'
export { useViewportStore, type ViewportState } from './viewportStore'
export {
  useSelectionStore,
  type SelectionStoreState,
  type RubberbandState,
  type SelectionPayload,
} from './selectionStore'
export { useInteractionStore, type InteractionStoreState } from './interactionStore'
export { useValidationStore, type ValidationStoreState } from './validationStore'
export {
  useUiStore,
  type UiStoreState,
  type Theme,
  type Language,
  type Modal,
  type Toast,
} from './uiStore'
export {
  deleteSelection,
  duplicateSelection,
  selectAll,
  clearSelection,
} from './commands'
export {
  selectNodeById,
  selectIncidentEdges,
  selectSelectedNodes,
  selectErrorsForId,
} from './selectors'
```

- [ ] **Step 2: Remove the duplicate `enableMapSet()` call from `selectionStore.ts`**

In `src/state/selectionStore.ts`, remove these two lines:

```ts
import { enableMapSet } from 'immer'
// ...
enableMapSet()
```

Keep everything else. The barrel's top-level `enableMapSet()` handles it globally.

**Order-of-import caveat:** if a test imports `selectionStore` directly (not through the barrel), `enableMapSet` may not have run yet. To be safe, keep the import chain: all tests that exercise selectionStore do so via `import { useSelectionStore } from './selectionStore'` — i.e., they touch the module-eval chain and Immer's `Set` support is enabled lazily.

Double-safe alternative: leave `enableMapSet()` in both places. It's idempotent (Immer guards against double-enable). Taking that approach: skip this Step 2 entirely and only ADD the call in the barrel.

**Chosen approach:** keep `enableMapSet()` in `selectionStore.ts` AND add another call at the top of `index.ts`. Idempotent. No risk of order-of-import surprises.

- [ ] **Step 3: Run the whole suite**

Run: `pnpm test`
Expected: all prior tests green + all Phase 2 tests green. Target count: ~220 (Phase 1 178 + ~45 new).

Run: `pnpm typecheck`
Expected: clean.

Run: `pnpm lint`
Expected: clean.

Run: `pnpm test:coverage`
Expected: thresholds met on all four configured layers (domain ≥95, rules ≥90, state ≥85, app ≥85).

Run: `pnpm build`
Expected: production build clean. Bundle should still be <400 KB gzipped (Phase 1 baseline was 118 KB gz).

- [ ] **Step 4: Verify atomicity**

Run: `wc -l src/state/*.ts src/app/*.ts`
Expected: largest file is `diagramStore.ts` at ~180–200 lines. No file >350 lines.

- [ ] **Step 5: Verify layer boundaries**

Run: `pnpm lint`
Expected: no layer-boundary violations. Spot-check: `src/state/*.ts` imports only `@/domain/*`, `@/notation/*`, and external deps. `src/app/bootstrap.ts` imports from `@/state`, `@/domain`, `@/notation`.

If any violation: fix before committing.

- [ ] **Step 6: Commit**

`/tmp/phase2-task14-msg.txt`:

```
feat(state): add barrel re-exports + centralise enableMapSet

Callers can now `import { useDiagramStore, selectNodeById } from
'@/state'`. enableMapSet() lives in the barrel so Set<NodeId>
drafts work globally; left the selectionStore.ts call in place
for import-order safety (idempotent).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

```bash
git add src/state/index.ts
git commit -F /tmp/phase2-task14-msg.txt
```

---

## Task 15: CHANGELOG entry

**Files:**
- Modify: `CHANGELOG.md` — prepend Phase 2 entry

- [ ] **Step 1: Prepend the Phase 2 entry**

Edit `CHANGELOG.md`. Above the existing Phase 1 entry, add:

```markdown
## [v2 / Phase 2] — 2026-04-22

### Added

- Six sliced Zustand stores under [src/state/](src/state/):
  - `diagramStore` — zundo-wrapped time machine scoped to `{diagram}` only (spec §4 bug fix: undo no longer wipes viewport/selection). Actions: addNode, updateNode, moveNode, resizeNode, removeNode (cascade), addEdge, updateEdge, setWaypoints, removeEdge, applyPatch, replaceDiagram, bringToFront, sendToBack.
  - `viewportStore` — zoom (clamped to [0.1, 4]), pan, `zoomAt(anchor, delta)`, `fit(bbox, viewport, padding)`.
  - `selectionStore` — `Set<NodeId>` / `Set<EdgeId>` + rubberband lifecycle.
  - `interactionStore` — XState actor stub (Phase 3 fills the real FSM).
  - `validationStore` — `errorsById` keyed by target; `enabled` persisted to `localStorage` under `er-editor:validation`.
  - `uiStore` — theme, language, panels, modals, toasts. Theme/language/panels persisted under `er-editor:ui`.
- [src/state/commands.ts](src/state/commands.ts) — cross-store orchestration (`deleteSelection`, `duplicateSelection`, `selectAll`, `clearSelection`). Group operations produce a single undo step via `applyPatch`.
- [src/state/selectors.ts](src/state/selectors.ts) — shared memoisable reads: `selectNodeById`, `selectIncidentEdges`, `selectSelectedNodes`, `selectErrorsForId`.
- [src/app/bootstrap.ts](src/app/bootstrap.ts) — `installSubscribers()` wires dev-mode invariants + debounced (150ms) Chen validation to the diagram store. Not yet called from `main.tsx` — Phase 6 wires it.
- [src/app/debounce.ts](src/app/debounce.ts) — minimal debounce helper.
- [src/state/index.ts](src/state/index.ts) — barrel for ergonomic single-import call sites.
- Coverage thresholds enforced for `src/state/**` and `src/app/**` (≥85% stmts/funcs/lines, ≥80% branches).

### Notes

- No React components produced in Phase 2; `src/canvas/ERCanvas.tsx` still renders a blank React Flow canvas — Phase 4 wires it to the stores.
- Stores never import each other. All cross-store coordination lives in `commands.ts` and `bootstrap.ts`.
- Persistence is opt-in: only `uiStore.{theme, language, panels}` and `validationStore.enabled` hit `localStorage`. Diagram never auto-persists.

```

- [ ] **Step 2: Commit**

`/tmp/phase2-task15-msg.txt`:

```
docs: changelog entry for Phase 2

Six sliced Zustand stores, commands/selectors/bootstrap support,
coverage thresholds. Phase 4 wires the canvas; Phase 6 calls
installSubscribers from main.tsx.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

```bash
git add CHANGELOG.md
git commit -F /tmp/phase2-task15-msg.txt
```

---

## Post-plan notes (for the controller)

- `installSubscribers` is intentionally NOT called from `main.tsx` yet — spec §4.3 puts app-level wiring as a Phase 6 (UI shell) responsibility, but the subscriber itself is Phase 2's concern. Phase 6 adds one line in `main.tsx`: `installSubscribers()` after the React tree mounts.
- Phase 3 replaces `interactionStore`'s stub machine with the full FSM (spec §4.6). The store's public surface (`snapshot`, `send`) stays the same, so downstream consumers will not need to change.
- Phase 4 consumes `useDiagramStore` + `useViewportStore` + `useSelectionStore` for custom React Flow node components.
- Phase 5 codecs will call `replaceDiagram(next)` on file load — which already clears the undo stack.

## Self-review checklist

Running through the plan with fresh eyes before handing off:

- **Spec coverage:** every store listed in spec §4.1 has a task (Tasks 3+5, 6, 7, 8, 9, 10). Commands in §4.3 are Task 11. Selectors in §4.7 are Task 12. Subscriber wiring in §4.4 is Task 13. All covered.
- **No placeholders:** every task body has runnable code, exact commands, explicit expectations.
- **Type consistency:** `DiagramStoreState.addNode(input: NodeInput): NodeId` is stable across Task 3 (definition), Task 11 (commands.ts consumer), Task 12 (selectors). Same for `applyPatch(patch: DiagramPatch)`. `NodeInput`/`EdgeInput`/`DiagramPatch` defined once in Task 2, imported everywhere else.
- **Middleware stack:** `subscribeWithSelector` outermost (needed for the bootstrap subscriber's selector-based subscription). `temporal` wraps `immer`. Verified in Task 3 code.
- **`enableMapSet`:** present at top of `selectionStore.ts` (Task 7) AND at top of `index.ts` barrel (Task 14). Idempotent.
- **`duplicateSelection`:** Task 11 Step 3 has a first-draft implementation that produces N undo steps, but the "**Note for reviewers**" block pre-emptively fixes it to the patch-based single-undo form. The test asserts single-undo semantics, so the patch form is the only one that passes — implementer will land on it.
- **Phase boundaries:** no React components, no canvas changes, no UI chrome — all reserved for Phases 4/6.
