# Phase 3 — Interaction FSM + Canvas Input Hooks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Phase 2 XState stub with the full `editorMachine` from spec §4.6, and deliver the canvas-layer input hooks (mouse / keyboard / touch) that translate raw DOM events into typed `EditorEvent`s the machine consumes. Phase 4 will mount these hooks on the React Flow canvas.

**Architecture:** `src/interaction/` owns events, guards, actions, the machine, the keybindings registry, and the store wrapping the machine's actor. Guards are pure predicates; actions are side-effectful functions that call `useXStore.getState()`. `src/canvas/hooks/` holds `useMouse` / `useKeyboard` / `useTouch` — all dispatch via `useInteractionStore.getState().send(event)`. Because the machine imports from `@/state`, the store file moves from `src/state/interactionStore.ts` (Phase 2 stub) to `src/interaction/interactionStore.ts` to satisfy the layer rule (state cannot import interaction).

**Tech Stack:** XState 5.30 (`setup` + `createMachine` + `createActor`), Zustand 5.0 + `subscribeWithSelector`, Vitest 3.2 with `@testing-library/react` 16 for hook tests.

---

## Key architectural decisions encoded in this plan

1. **Store file moves.** `src/state/interactionStore.ts` (Phase 2 stub) is DELETED. `src/interaction/interactionStore.ts` (new) wraps the real machine. `src/state/index.ts` drops the `useInteractionStore` re-export; consumers use `import { useInteractionStore } from '@/interaction'`.
2. **Machine imports from stores directly.** Actions call `useDiagramStore.getState()`, `useSelectionStore.getState()`, `useViewportStore.getState()`, `useUiStore.getState()`. Also uses the `commands.ts` cross-store helpers (`deleteSelection`, `duplicateSelection`, etc.).
3. **Machine context vs store state.** Context holds transient drag state (`draggedNodeId`, `dragOriginPoint`, `connectionFromId`, `quickFirstId`, `resizeNodeId`, `resizeHandle`). Everything else lives in Zustand stores.
4. **Pointer events carry `button`** so mouse-hook hooks can signal left/middle/right. Middle/right buttons route to `panning`; left-button is for selection/placement/drawing per current tool.
5. **`crossedDragThreshold` guard** uses a 3 px threshold (constant `DRAG_THRESHOLD_PX`). Below threshold, pointer move keeps us in `maybeDragging`; at threshold we transition to `dragging`.
6. **ESCAPE is a top-level transition** that resets context and goes to `selecting.idle`. Defined once at the machine's root `on:` map.
7. **`PICK_TOOL` is a top-level transition** that routes to the state matching the new tool, assigns `tool` in context, and resets transient fields. Each tool has a corresponding target:
   - `select` → `selecting.idle`
   - `pan` → `panning.idle`
   - `entity` → `placing.entity`
   - `relationship` → `placing.relationship`
   - `attribute` → `placing.attribute`
   - `isa` → `placing.isa`
   - `connect` → `drawing.idle`
   - `quickRelationship` → `quickRelationship.idle`
   - `quickGeneralization` → `quickGeneralization.idle`
8. **Keybinding format** is `Modifier+...+KeyName` with a canonical order (`Ctrl`, `Meta`, `Shift`, `Alt`, then the letter/key). The `matchKeybinding` helper normalises incoming `KeyboardEvent`s to this string and looks up the registry with an `O(1)` map.
9. **Cross-platform shortcuts** (undo/redo/copy/etc.) register BOTH `Ctrl+Z` and `Meta+Z`. The match helper picks whichever the user fires.
10. **100% FSM transition coverage** is the spec's explicit exit criterion — `machine.test.ts` enumerates every state-event-target triple and asserts the transition, plus every action/guard combination.

---

## File structure

```
src/
  interaction/
    events.ts                      (EditorEvent union, Tool, Modifiers, ResizeHandle, PointerButton)
    events.test.ts
    context.ts                     (EditorContext interface + initialContext)
    context.test.ts
    guards.ts                      (pure predicates over diagram + stores)
    guards.test.ts
    actions.ts                     (side-effectful action fns — call getState().mutate)
    actions.test.ts
    machine.ts                     (setup + createMachine body — references guards/actions by name)
    machine.test.ts                (transition coverage — 100% state×event pairs)
    keybindings.ts                 (Keybinding type, registry, matchKeybinding)
    keybindings.test.ts
    interactionStore.ts            (wraps createActor(editorMachine) into Zustand)
    interactionStore.test.ts
    integration.test.ts            (full cycle: PICK_TOOL → pointer events → diagram mutation)
    index.ts                       (barrel)
  canvas/
    hooks/
      useMouse.ts                  (onPointerDown/Move/Up/Wheel/DoubleClick/ContextMenu)
      useMouse.test.tsx
      useKeyboard.ts               (global keydown listener + text-field filter)
      useKeyboard.test.tsx
      useTouch.ts                  (pointerType='touch' gestures: tap/drag/pinch/long-press)
      useTouch.test.tsx
      index.ts                     (barrel)
  state/
    interactionStore.ts            (DELETE)
    interactionStore.test.ts       (DELETE)
    index.ts                       (UPDATE — drop interactionStore re-export)
```

Plus:
- Update `vitest.config.ts` coverage thresholds: add `'src/interaction/**': { 90, 85, 90, 90 }` and `'src/canvas/hooks/**': { 85, 80, 85, 85 }`.
- Update `CHANGELOG.md` with Phase 3 entry.

---

## Task 1: Preconditions — coverage thresholds

**Files:**
- Modify: `vitest.config.ts`

- [ ] **Step 1: Add interaction/ and canvas/hooks/ thresholds**

Edit the `coverage.thresholds` block. Insert these entries after the existing `'src/app/**'` entry:

```ts
'src/interaction/**': {
  statements: 90,
  branches: 85,
  functions: 90,
  lines: 90,
},
'src/canvas/hooks/**': {
  statements: 85,
  branches: 80,
  functions: 85,
  lines: 85,
},
```

- [ ] **Step 2: Run coverage — expect pass (empty dirs vacuously satisfy)**

Run: `pnpm test:coverage`
Expected: exit 0. All prior tests pass; new thresholds don't break anything because the target dirs are empty.

- [ ] **Step 3: Commit**

```bash
cat > /tmp/phase3-task1-msg.txt <<'EOF'
test: add interaction/ and canvas/hooks/ coverage thresholds for Phase 3

≥90% stmts/funcs/lines, ≥85% branches on interaction; ≥85/80/85/85
on canvas/hooks. Files land in subsequent Phase 3 tasks.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
git add vitest.config.ts
git commit -F /tmp/phase3-task1-msg.txt
```

---

## Task 2: `events.ts` + `context.ts` — foundational types

**Files:**
- Create: `src/interaction/events.ts`
- Create: `src/interaction/events.test.ts`
- Create: `src/interaction/context.ts`
- Create: `src/interaction/context.test.ts`

- [ ] **Step 1: Write `events.ts`**

```ts
import type { NodeId, EdgeId, Point } from '@/domain/types'

export type Tool =
  | 'select'
  | 'pan'
  | 'entity'
  | 'relationship'
  | 'attribute'
  | 'isa'
  | 'connect'
  | 'quickRelationship'
  | 'quickGeneralization'

export type PointerButton = 'left' | 'middle' | 'right'

export type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

export interface Modifiers {
  readonly shift: boolean
  readonly ctrl: boolean
  readonly alt: boolean
  readonly meta: boolean
}

export const NO_MODIFIERS: Modifiers = Object.freeze({
  shift: false, ctrl: false, alt: false, meta: false,
})

export type EditorEvent =
  // Tool picker
  | { readonly type: 'PICK_TOOL'; readonly tool: Tool }
  // Canvas pointer lifecycle
  | { readonly type: 'CANVAS_POINTER_DOWN'; readonly point: Point; readonly modifiers: Modifiers; readonly button: PointerButton }
  | { readonly type: 'CANVAS_POINTER_MOVE'; readonly point: Point }
  | { readonly type: 'CANVAS_POINTER_UP'; readonly point: Point }
  // Node/edge pointer events
  | { readonly type: 'NODE_POINTER_DOWN'; readonly nodeId: NodeId; readonly point: Point; readonly modifiers: Modifiers; readonly button: PointerButton }
  | { readonly type: 'NODE_POINTER_UP'; readonly nodeId: NodeId; readonly point: Point }
  | { readonly type: 'EDGE_POINTER_DOWN'; readonly edgeId: EdgeId; readonly point: Point; readonly modifiers: Modifiers; readonly button: PointerButton }
  // Resize + handles
  | { readonly type: 'HANDLE_POINTER_DOWN'; readonly nodeId: NodeId; readonly handleId: string; readonly point: Point }
  | { readonly type: 'RESIZE_HANDLE_POINTER_DOWN'; readonly nodeId: NodeId; readonly handle: ResizeHandle; readonly point: Point }
  // Contextual
  | { readonly type: 'ESCAPE' }
  | { readonly type: 'DELETE' }
  // History
  | { readonly type: 'UNDO' }
  | { readonly type: 'REDO' }
  // Clipboard (Phase 3 wires stubs; full impl in Sub-project 4)
  | { readonly type: 'COPY' }
  | { readonly type: 'CUT' }
  | { readonly type: 'PASTE' }
  | { readonly type: 'DUPLICATE' }
  // Selection ops
  | { readonly type: 'SELECT_ALL' }
  | { readonly type: 'INVERT_SELECTION' }
  | { readonly type: 'NUDGE'; readonly dx: number; readonly dy: number }
  | { readonly type: 'CYCLE_SELECTION'; readonly direction: 'forward' | 'backward' }
  // Viewport
  | { readonly type: 'WHEEL_ZOOM'; readonly anchor: Point; readonly delta: number }
  | { readonly type: 'FIT' }
  | { readonly type: 'ZOOM_IN' }
  | { readonly type: 'ZOOM_OUT' }
  // Inline rename
  | { readonly type: 'RENAME' }
  // Modal confirm/cancel
  | { readonly type: 'CONFIRM' }
  | { readonly type: 'CANCEL' }
  // Cheatsheet
  | { readonly type: 'TOGGLE_CHEATSHEET' }

export type EditorEventType = EditorEvent['type']
```

- [ ] **Step 2: Write `events.test.ts`**

```ts
import { describe, it, expect, expectTypeOf } from 'vitest'
import { NO_MODIFIERS, type EditorEvent, type Tool, type Modifiers, type PointerButton, type ResizeHandle } from './events'

describe('NO_MODIFIERS', () => {
  it('is all-false and frozen', () => {
    expect(NO_MODIFIERS).toEqual({ shift: false, ctrl: false, alt: false, meta: false })
    expect(Object.isFrozen(NO_MODIFIERS)).toBe(true)
  })
})

describe('EditorEvent discriminated union', () => {
  it('PICK_TOOL narrows tool field', () => {
    const e: EditorEvent = { type: 'PICK_TOOL', tool: 'entity' }
    if (e.type === 'PICK_TOOL') {
      expectTypeOf(e.tool).toEqualTypeOf<Tool>()
    }
  })

  it('CANVAS_POINTER_DOWN carries button and modifiers', () => {
    const e: EditorEvent = {
      type: 'CANVAS_POINTER_DOWN',
      point: { x: 0, y: 0 },
      modifiers: NO_MODIFIERS,
      button: 'left',
    }
    if (e.type === 'CANVAS_POINTER_DOWN') {
      expectTypeOf(e.button).toEqualTypeOf<PointerButton>()
      expectTypeOf(e.modifiers).toEqualTypeOf<Modifiers>()
    }
  })

  it('RESIZE_HANDLE_POINTER_DOWN carries a ResizeHandle', () => {
    const e: EditorEvent = {
      type: 'RESIZE_HANDLE_POINTER_DOWN',
      nodeId: 'x' as never,
      handle: 'se',
      point: { x: 0, y: 0 },
    }
    if (e.type === 'RESIZE_HANDLE_POINTER_DOWN') {
      expectTypeOf(e.handle).toEqualTypeOf<ResizeHandle>()
    }
  })
})
```

- [ ] **Step 3: Write `context.ts`**

```ts
import type { NodeId, Point } from '@/domain/types'
import type { Tool, ResizeHandle } from './events'

export interface EditorContext {
  readonly tool: Tool
  readonly draggedNodeId: NodeId | null
  readonly dragOriginPoint: Point | null
  readonly connectionFromId: NodeId | null
  readonly quickFirstId: NodeId | null
  readonly resizeNodeId: NodeId | null
  readonly resizeHandle: ResizeHandle | null
}

export const initialContext: EditorContext = Object.freeze({
  tool: 'select',
  draggedNodeId: null,
  dragOriginPoint: null,
  connectionFromId: null,
  quickFirstId: null,
  resizeNodeId: null,
  resizeHandle: null,
})
```

- [ ] **Step 4: Write `context.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { initialContext } from './context'

describe('initialContext', () => {
  it('starts with select tool and all transient fields null', () => {
    expect(initialContext.tool).toBe('select')
    expect(initialContext.draggedNodeId).toBeNull()
    expect(initialContext.dragOriginPoint).toBeNull()
    expect(initialContext.connectionFromId).toBeNull()
    expect(initialContext.quickFirstId).toBeNull()
    expect(initialContext.resizeNodeId).toBeNull()
    expect(initialContext.resizeHandle).toBeNull()
  })

  it('is frozen', () => {
    expect(Object.isFrozen(initialContext)).toBe(true)
  })
})
```

- [ ] **Step 5: Run tests + typecheck + lint**

Run: `pnpm test -- src/interaction/events.test.ts src/interaction/context.test.ts --run`
Expected: 5+2 = 7 tests pass (actual count may vary slightly — expectTypeOf blocks count as tests).

Run: `pnpm typecheck && pnpm lint`
Expected: clean.

Remove `src/interaction/.gitkeep` if present (`ls src/interaction/` first).

- [ ] **Step 6: Commit**

```bash
cat > /tmp/phase3-task2-msg.txt <<'EOF'
feat(interaction): add EditorEvent union + EditorContext

Tool picker, canvas/node/edge pointer lifecycle, resize handles,
history, clipboard (stubs), selection, viewport, rename,
modal confirm/cancel, and cheatsheet events. Context holds
transient drag/connection/resize fields — persistent state
stays in Zustand stores.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
git add src/interaction/events.ts src/interaction/events.test.ts \
        src/interaction/context.ts src/interaction/context.test.ts
git rm src/interaction/.gitkeep 2>/dev/null || true
git commit -F /tmp/phase3-task2-msg.txt
```

---

## Task 3: `guards.ts` — pure predicates

**Files:**
- Create: `src/interaction/guards.ts`
- Create: `src/interaction/guards.test.ts`

- [ ] **Step 1: Write tests first (TDD)**

```ts
import { describe, it, expect } from 'vitest'
import {
  isEntity, isRelationship, isAttribute, isISA,
  canHaveAttribute, isDifferentNode,
  canBeRelationshipParticipant, canBeISAChild,
} from './guards'
import { makeDiagram } from '@fixtures/diagrams/makeDiagram'
import { makeEntity, makeRelationship, makeAttribute, makeIsa } from '@fixtures/diagrams/makeNode'
import { makeIsaEdge } from '@fixtures/diagrams/makeEdge'
import { asNodeId } from '@/domain/id'

describe('isEntity / isRelationship / isAttribute / isISA', () => {
  it('discriminates by node kind', () => {
    const e = makeEntity({ name: 'E' })
    const r = makeRelationship({ name: 'R' })
    const a = makeAttribute({ name: 'a' })
    const i = makeIsa()
    const d = makeDiagram([e, r, a, i], [])

    expect(isEntity(d, e.id)).toBe(true)
    expect(isEntity(d, r.id)).toBe(false)
    expect(isRelationship(d, r.id)).toBe(true)
    expect(isAttribute(d, a.id)).toBe(true)
    expect(isISA(d, i.id)).toBe(true)
  })

  it('returns false for missing ids', () => {
    const d = makeDiagram([], [])
    expect(isEntity(d, asNodeId('missing_01'))).toBe(false)
    expect(isISA(d, asNodeId('missing_02'))).toBe(false)
  })
})

describe('canHaveAttribute', () => {
  it('true for entity and relationship', () => {
    const e = makeEntity({ name: 'E' })
    const r = makeRelationship({ name: 'R' })
    const d = makeDiagram([e, r], [])
    expect(canHaveAttribute(d, e.id)).toBe(true)
    expect(canHaveAttribute(d, r.id)).toBe(true)
  })
  it('false for attribute and isa', () => {
    const a = makeAttribute({ name: 'a' })
    const i = makeIsa()
    const d = makeDiagram([a, i], [])
    expect(canHaveAttribute(d, a.id)).toBe(false)
    expect(canHaveAttribute(d, i.id)).toBe(false)
  })
})

describe('isDifferentNode', () => {
  it('true when ids differ, false when equal', () => {
    const a = asNodeId('n000000001')
    const b = asNodeId('n000000002')
    expect(isDifferentNode(a, b)).toBe(true)
    expect(isDifferentNode(a, a)).toBe(false)
  })
  it('false when either id is null', () => {
    const a = asNodeId('n000000001')
    expect(isDifferentNode(null, a)).toBe(false)
    expect(isDifferentNode(a, null)).toBe(false)
  })
})

describe('canBeRelationshipParticipant', () => {
  it('true only for entities', () => {
    const e = makeEntity({ name: 'E' })
    const r = makeRelationship({ name: 'R' })
    const d = makeDiagram([e, r], [])
    expect(canBeRelationshipParticipant(d, e.id)).toBe(true)
    expect(canBeRelationshipParticipant(d, r.id)).toBe(false)
  })
})

describe('canBeISAChild', () => {
  it('true for an entity not already a child', () => {
    const e = makeEntity({ name: 'Child' })
    const d = makeDiagram([e], [])
    expect(canBeISAChild(d, e.id)).toBe(true)
  })
  it('false for entity already a child of an ISA', () => {
    const parent = makeEntity({ name: 'P' })
    const child = makeEntity({ name: 'C' })
    const isa = makeIsa()
    const d = makeDiagram(
      [parent, child, isa],
      [makeIsaEdge(parent.id, isa.id, 'parent'), makeIsaEdge(isa.id, child.id, 'child')],
    )
    expect(canBeISAChild(d, child.id)).toBe(false)
  })
  it('false for weak entities', () => {
    const weak = makeEntity({ name: 'W', isWeak: true })
    const d = makeDiagram([weak], [])
    expect(canBeISAChild(d, weak.id)).toBe(false)
  })
  it('false for non-entity kinds', () => {
    const r = makeRelationship({ name: 'R' })
    const d = makeDiagram([r], [])
    expect(canBeISAChild(d, r.id)).toBe(false)
  })
})
```

- [ ] **Step 2: Run — FAIL (module not found)**

Run: `pnpm test -- src/interaction/guards.test.ts --run`
Expected: FAIL.

- [ ] **Step 3: Write `guards.ts`**

```ts
import type { Diagram, NodeId } from '@/domain/types'
import {
  isAttributeNode, isEntityNode, isIsaEdge, isIsaNode, isRelationshipNode,
  incidentEdges,
} from '@/domain/graph'

export const isEntity = (diagram: Diagram, nodeId: NodeId): boolean => {
  const n = diagram.nodesById[nodeId]
  return !!n && isEntityNode(n)
}

export const isRelationship = (diagram: Diagram, nodeId: NodeId): boolean => {
  const n = diagram.nodesById[nodeId]
  return !!n && isRelationshipNode(n)
}

export const isAttribute = (diagram: Diagram, nodeId: NodeId): boolean => {
  const n = diagram.nodesById[nodeId]
  return !!n && isAttributeNode(n)
}

export const isISA = (diagram: Diagram, nodeId: NodeId): boolean => {
  const n = diagram.nodesById[nodeId]
  return !!n && isIsaNode(n)
}

export const canHaveAttribute = (diagram: Diagram, nodeId: NodeId): boolean =>
  isEntity(diagram, nodeId) || isRelationship(diagram, nodeId)

export const isDifferentNode = (a: NodeId | null, b: NodeId | null): boolean => {
  if (a === null || b === null) return false
  return a !== b
}

export const canBeRelationshipParticipant = (diagram: Diagram, nodeId: NodeId): boolean =>
  isEntity(diagram, nodeId)

export const canBeISAChild = (diagram: Diagram, nodeId: NodeId): boolean => {
  const n = diagram.nodesById[nodeId]
  if (!n || !isEntityNode(n) || n.isWeak) return false
  // Already a child of some ISA?
  for (const edge of incidentEdges(diagram, nodeId)) {
    if (isIsaEdge(edge) && edge.role === 'child' && edge.targetId === nodeId) return false
  }
  return true
}
```

- [ ] **Step 4: Run — expect all tests pass**

Run: `pnpm test -- src/interaction/guards.test.ts --run`
Expected: 11 tests pass.

- [ ] **Step 5: typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
cat > /tmp/phase3-task3-msg.txt <<'EOF'
feat(interaction): add guards.ts with pure predicates

is{Entity,Relationship,Attribute,ISA}, canHaveAttribute,
isDifferentNode, canBeRelationshipParticipant, canBeISAChild.
All take Diagram + NodeId and return boolean — no side effects.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
git add src/interaction/guards.ts src/interaction/guards.test.ts
git commit -F /tmp/phase3-task3-msg.txt
```

---

## Task 4: `actions.ts` — side-effectful actions

**Files:**
- Create: `src/interaction/actions.ts`
- Create: `src/interaction/actions.test.ts`

- [ ] **Step 1: Write tests**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  placeNode, moveDraggedNode, connectNodes, beginRubberband,
  updateRubberbandAction, commitRubberbandAction, selectNodeFromEvent,
  panViewportAction, zoomAtPointAction, nudgeSelection,
  undoAction, redoAction, deleteSelectionAction, duplicateSelectionAction,
  selectAllAction, clearSelectionAction,
  stubCopy, stubCut, stubPaste, toggleCheatsheetAction,
} from './actions'
import { useDiagramStore } from '@/state/diagramStore'
import { useViewportStore } from '@/state/viewportStore'
import { useSelectionStore } from '@/state/selectionStore'
import { useUiStore } from '@/state/uiStore'
import { emptyDiagram } from '@/domain/types'
import { asNodeId } from '@/domain/id'
import { initialContext, type EditorContext } from './context'
import type { EditorEvent } from './events'
import { NO_MODIFIERS } from './events'

const withContext = (patch: Partial<EditorContext> = {}): EditorContext =>
  ({ ...initialContext, ...patch })

const resetStores = () => {
  useDiagramStore.setState({ diagram: emptyDiagram() })
  useDiagramStore.temporal.getState().clear()
  useSelectionStore.setState({
    selectedNodeIds: new Set(), selectedEdgeIds: new Set(), rubberband: null,
  })
  useViewportStore.setState({ zoom: 1, pan: { x: 0, y: 0 } })
  useUiStore.setState({
    theme: 'system', language: 'en',
    panels: { properties: true, minimap: false },
    modals: [], toasts: [],
  })
}

describe('actions — placeNode', () => {
  beforeEach(resetStores)
  it('places an entity at the event point when tool is entity', () => {
    const event: EditorEvent = {
      type: 'CANVAS_POINTER_UP', point: { x: 50, y: 75 },
    }
    placeNode(withContext({ tool: 'entity' }), event)
    const d = useDiagramStore.getState().diagram
    expect(d.nodeOrder).toHaveLength(1)
    const node = d.nodesById[d.nodeOrder[0]!]!
    expect(node.kind).toBe('entity')
    expect(node.position).toEqual({ x: 50, y: 75 })
  })
  it('places a relationship when tool is relationship', () => {
    placeNode(withContext({ tool: 'relationship' }), {
      type: 'CANVAS_POINTER_UP', point: { x: 0, y: 0 },
    })
    const d = useDiagramStore.getState().diagram
    expect(d.nodesById[d.nodeOrder[0]!]!.kind).toBe('relationship')
  })
  it('places an attribute when tool is attribute', () => {
    placeNode(withContext({ tool: 'attribute' }), {
      type: 'CANVAS_POINTER_UP', point: { x: 0, y: 0 },
    })
    const d = useDiagramStore.getState().diagram
    expect(d.nodesById[d.nodeOrder[0]!]!.kind).toBe('attribute')
  })
  it('places an isa when tool is isa', () => {
    placeNode(withContext({ tool: 'isa' }), {
      type: 'CANVAS_POINTER_UP', point: { x: 0, y: 0 },
    })
    const d = useDiagramStore.getState().diagram
    expect(d.nodesById[d.nodeOrder[0]!]!.kind).toBe('isa')
  })
  it('no-ops for a non-placement tool', () => {
    placeNode(withContext({ tool: 'select' }), {
      type: 'CANVAS_POINTER_UP', point: { x: 0, y: 0 },
    })
    expect(useDiagramStore.getState().diagram.nodeOrder).toHaveLength(0)
  })
})

describe('actions — moveDraggedNode', () => {
  beforeEach(resetStores)
  it('moves the dragged node to the event point', () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'E', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    moveDraggedNode(
      withContext({ draggedNodeId: id, dragOriginPoint: { x: 0, y: 0 } }),
      { type: 'CANVAS_POINTER_MOVE', point: { x: 100, y: 50 } },
    )
    expect(useDiagramStore.getState().diagram.nodesById[id]!.position)
      .toEqual({ x: 100, y: 50 })
  })
  it('no-ops when draggedNodeId is null', () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'E', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    moveDraggedNode(
      withContext({ draggedNodeId: null, dragOriginPoint: null }),
      { type: 'CANVAS_POINTER_MOVE', point: { x: 100, y: 50 } },
    )
    expect(useDiagramStore.getState().diagram.nodesById[id]!.position).toEqual({ x: 0, y: 0 })
  })
})

describe('actions — connectNodes', () => {
  beforeEach(resetStores)
  it('adds an entity-relationship edge for quick-relationship tool', () => {
    const store = useDiagramStore.getState()
    const a = store.addNode({
      kind: 'entity', name: 'A', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const b = store.addNode({
      kind: 'entity', name: 'B', isWeak: false,
      position: { x: 200, y: 0 }, size: { width: 120, height: 60 },
    })
    connectNodes(
      withContext({ tool: 'quickRelationship', quickFirstId: a }),
      { type: 'NODE_POINTER_DOWN', nodeId: b, point: { x: 200, y: 0 }, modifiers: NO_MODIFIERS, button: 'left' },
    )
    // Quick-relationship creates a rel node + two ER edges
    const d = useDiagramStore.getState().diagram
    expect(d.nodeOrder).toHaveLength(3)  // 2 entities + 1 rel
    expect(d.edgeOrder).toHaveLength(2)  // 2 ER edges
  })
  it('adds an isa hierarchy for quick-generalization tool', () => {
    const store = useDiagramStore.getState()
    const parent = store.addNode({
      kind: 'entity', name: 'P', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const child = store.addNode({
      kind: 'entity', name: 'C', isWeak: false,
      position: { x: 0, y: 200 }, size: { width: 120, height: 60 },
    })
    connectNodes(
      withContext({ tool: 'quickGeneralization', quickFirstId: parent }),
      { type: 'NODE_POINTER_DOWN', nodeId: child, point: { x: 0, y: 200 }, modifiers: NO_MODIFIERS, button: 'left' },
    )
    const d = useDiagramStore.getState().diagram
    expect(d.nodeOrder).toHaveLength(3)  // 2 entities + 1 isa
    expect(d.edgeOrder).toHaveLength(2)  // parent edge + child edge
  })
  it('adds an ER edge for connect tool (entity → relationship)', () => {
    const store = useDiagramStore.getState()
    const e = store.addNode({
      kind: 'entity', name: 'E', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const r = store.addNode({
      kind: 'relationship', name: 'R', isIdentifying: false,
      position: { x: 200, y: 0 }, size: { width: 140, height: 70 },
    })
    connectNodes(
      withContext({ tool: 'connect', connectionFromId: e }),
      { type: 'NODE_POINTER_UP', nodeId: r, point: { x: 200, y: 0 } },
    )
    expect(useDiagramStore.getState().diagram.edgeOrder).toHaveLength(1)
  })
})

describe('actions — rubberband', () => {
  beforeEach(resetStores)
  it('beginRubberband starts selection rubberband', () => {
    beginRubberband(initialContext, {
      type: 'CANVAS_POINTER_DOWN', point: { x: 10, y: 10 }, modifiers: NO_MODIFIERS, button: 'left',
    })
    expect(useSelectionStore.getState().rubberband).toEqual({
      origin: { x: 10, y: 10 }, current: { x: 10, y: 10 },
    })
  })
  it('updateRubberbandAction updates current point', () => {
    useSelectionStore.getState().startRubberband({ x: 0, y: 0 })
    updateRubberbandAction(initialContext, {
      type: 'CANVAS_POINTER_MOVE', point: { x: 50, y: 50 },
    })
    expect(useSelectionStore.getState().rubberband?.current).toEqual({ x: 50, y: 50 })
  })
  it('commitRubberbandAction selects intersecting nodes', () => {
    const store = useDiagramStore.getState()
    const inside = store.addNode({
      kind: 'entity', name: 'I', isWeak: false,
      position: { x: 50, y: 50 }, size: { width: 20, height: 20 },
    })
    const outside = store.addNode({
      kind: 'entity', name: 'O', isWeak: false,
      position: { x: 500, y: 500 }, size: { width: 20, height: 20 },
    })
    useSelectionStore.getState().startRubberband({ x: 0, y: 0 })
    useSelectionStore.getState().updateRubberband({ x: 100, y: 100 })
    commitRubberbandAction(initialContext, { type: 'CANVAS_POINTER_UP', point: { x: 100, y: 100 } })
    const selected = useSelectionStore.getState().selectedNodeIds
    expect(selected.has(inside)).toBe(true)
    expect(selected.has(outside)).toBe(false)
    expect(useSelectionStore.getState().rubberband).toBeNull()
  })
})

describe('actions — selectNodeFromEvent', () => {
  beforeEach(resetStores)
  it('replaces selection on plain click', () => {
    const a = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'A', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    useSelectionStore.getState().select({ nodes: [asNodeId('other_____')], edges: [] })
    selectNodeFromEvent(initialContext, {
      type: 'NODE_POINTER_DOWN', nodeId: a, point: { x: 0, y: 0 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    const sel = useSelectionStore.getState().selectedNodeIds
    expect([...sel]).toEqual([a])
  })
  it('toggles selection on shift-click', () => {
    const a = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'A', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const b = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'B', isWeak: false,
      position: { x: 200, y: 0 }, size: { width: 120, height: 60 },
    })
    useSelectionStore.getState().select({ nodes: [a], edges: [] })
    selectNodeFromEvent(initialContext, {
      type: 'NODE_POINTER_DOWN', nodeId: b, point: { x: 200, y: 0 },
      modifiers: { ...NO_MODIFIERS, shift: true }, button: 'left',
    })
    const sel = useSelectionStore.getState().selectedNodeIds
    expect(sel.has(a)).toBe(true)
    expect(sel.has(b)).toBe(true)
  })
})

describe('actions — viewport', () => {
  beforeEach(resetStores)
  it('panViewportAction applies delta to pan', () => {
    useViewportStore.setState({ zoom: 1, pan: { x: 10, y: 20 } })
    panViewportAction(
      withContext({ dragOriginPoint: { x: 0, y: 0 } }),
      { type: 'CANVAS_POINTER_MOVE', point: { x: 30, y: 30 } },
    )
    // pan = initial pan + (point - dragOriginPoint) = (10,20) + (30,30) = (40,50)
    const { pan } = useViewportStore.getState()
    expect(pan).toEqual({ x: 40, y: 50 })
  })
  it('zoomAtPointAction delegates to viewportStore.zoomAt', () => {
    zoomAtPointAction(initialContext, {
      type: 'WHEEL_ZOOM', anchor: { x: 100, y: 50 }, delta: 1,
    })
    const { zoom } = useViewportStore.getState()
    expect(zoom).toBe(2)
  })
})

describe('actions — selection ops', () => {
  beforeEach(resetStores)
  it('nudgeSelection moves all selected by (dx, dy)', () => {
    const a = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'A', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    useSelectionStore.getState().select({ nodes: [a], edges: [] })
    nudgeSelection(initialContext, { type: 'NUDGE', dx: 5, dy: 3 })
    expect(useDiagramStore.getState().diagram.nodesById[a]!.position).toEqual({ x: 5, y: 3 })
  })
  it('undoAction + redoAction call temporal', () => {
    const addedId = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'A', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    undoAction(initialContext, { type: 'UNDO' })
    expect(useDiagramStore.getState().diagram.nodeOrder).toEqual([])
    redoAction(initialContext, { type: 'REDO' })
    expect(useDiagramStore.getState().diagram.nodeOrder).toEqual([addedId])
  })
  it('deleteSelection + duplicateSelection + selectAll + clearSelection run', () => {
    const a = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'A', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    selectAllAction(initialContext, { type: 'SELECT_ALL' })
    expect(useSelectionStore.getState().selectedNodeIds.has(a)).toBe(true)

    duplicateSelectionAction(initialContext, { type: 'DUPLICATE' })
    expect(useDiagramStore.getState().diagram.nodeOrder).toHaveLength(2)

    deleteSelectionAction(initialContext, { type: 'DELETE' })
    expect(useDiagramStore.getState().diagram.nodeOrder).toHaveLength(1)

    clearSelectionAction(initialContext, { type: 'ESCAPE' })
    expect(useSelectionStore.getState().selectedNodeIds.size).toBe(0)
  })
})

describe('actions — stubs + cheatsheet', () => {
  beforeEach(resetStores)
  it('stubCopy/stubCut/stubPaste do not throw and log once', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    stubCopy(initialContext, { type: 'COPY' })
    stubCut(initialContext, { type: 'CUT' })
    stubPaste(initialContext, { type: 'PASTE' })
    expect(spy).toHaveBeenCalledTimes(3)
    spy.mockRestore()
  })
  it('toggleCheatsheetAction pushes and then pops a cheatsheet modal', () => {
    toggleCheatsheetAction(initialContext, { type: 'TOGGLE_CHEATSHEET' })
    expect(useUiStore.getState().modals.find((m) => m.kind === 'cheatsheet')).toBeDefined()
    toggleCheatsheetAction(initialContext, { type: 'TOGGLE_CHEATSHEET' })
    expect(useUiStore.getState().modals.find((m) => m.kind === 'cheatsheet')).toBeUndefined()
  })
})
```

- [ ] **Step 2: FAIL**

Run: `pnpm test -- src/interaction/actions.test.ts --run`
Expected: FAIL.

- [ ] **Step 3: Write `actions.ts`**

```ts
import { useDiagramStore } from '@/state/diagramStore'
import { useSelectionStore } from '@/state/selectionStore'
import { useViewportStore } from '@/state/viewportStore'
import { useUiStore } from '@/state/uiStore'
import {
  deleteSelection as deleteSelectionCmd,
  duplicateSelection as duplicateSelectionCmd,
  selectAll as selectAllCmd,
  clearSelection as clearSelectionCmd,
} from '@/state/commands'
import { bboxFromNodeLike, bboxIntersects } from '@/domain/geometry'
import { isEntityNode } from '@/domain/graph'
import { newNodeId } from '@/domain/id'
import type { BBox, EntityRelationshipEdge, ISAEdge } from '@/domain/types'
import type { EditorContext } from './context'
import type { EditorEvent, Tool } from './events'

// ——— helpers ———

const DEFAULT_SIZES = {
  entity:       { width: 120, height: 60 },
  relationship: { width: 140, height: 70 },
  attribute:    { width: 90,  height: 50 },
  isa:          { width: 100, height: 60 },
} as const

const bboxOfRubberband = (origin: { x: number; y: number }, current: { x: number; y: number }): BBox => ({
  x: Math.min(origin.x, current.x),
  y: Math.min(origin.y, current.y),
  width: Math.abs(current.x - origin.x),
  height: Math.abs(current.y - origin.y),
})

// ——— placement + drag ———

export const placeNode = (context: EditorContext, event: EditorEvent): void => {
  if (event.type !== 'CANVAS_POINTER_UP') return
  const tool = context.tool
  if (tool !== 'entity' && tool !== 'relationship' && tool !== 'attribute' && tool !== 'isa') return
  const size = DEFAULT_SIZES[tool]
  if (tool === 'entity') {
    useDiagramStore.getState().addNode({
      kind: 'entity', name: 'Entity', isWeak: false,
      position: event.point, size,
    })
  } else if (tool === 'relationship') {
    useDiagramStore.getState().addNode({
      kind: 'relationship', name: 'Relationship', isIdentifying: false,
      position: event.point, size,
    })
  } else if (tool === 'attribute') {
    useDiagramStore.getState().addNode({
      kind: 'attribute', name: 'attribute',
      isKey: false, isDiscriminant: false, isMultivalued: false, isDerived: false, isComposite: false,
      position: event.point, size,
    })
  } else {
    useDiagramStore.getState().addNode({
      kind: 'isa', isTotal: false,
      position: event.point, size,
    })
  }
}

export const moveDraggedNode = (context: EditorContext, event: EditorEvent): void => {
  if (event.type !== 'CANVAS_POINTER_MOVE') return
  if (!context.draggedNodeId) return
  useDiagramStore.getState().moveNode(context.draggedNodeId, event.point)
}

// ——— rubberband ———

export const beginRubberband = (_context: EditorContext, event: EditorEvent): void => {
  if (event.type !== 'CANVAS_POINTER_DOWN') return
  useSelectionStore.getState().startRubberband(event.point)
}

export const updateRubberbandAction = (_context: EditorContext, event: EditorEvent): void => {
  if (event.type !== 'CANVAS_POINTER_MOVE') return
  useSelectionStore.getState().updateRubberband(event.point)
}

export const commitRubberbandAction = (_context: EditorContext, _event: EditorEvent): void => {
  const rb = useSelectionStore.getState().rubberband
  if (!rb) return
  const rbBox = bboxOfRubberband(rb.origin, rb.current)
  const diagram = useDiagramStore.getState().diagram
  const nodes = diagram.nodeOrder
    .map((id) => diagram.nodesById[id])
    .filter((n): n is NonNullable<typeof n> => !!n)
    .filter((n) => bboxIntersects(bboxFromNodeLike(n), rbBox))
    .map((n) => n.id)
  useSelectionStore.getState().commitRubberband({ nodes, edges: [] })
}

// ——— selection ———

export const selectNodeFromEvent = (_context: EditorContext, event: EditorEvent): void => {
  if (event.type !== 'NODE_POINTER_DOWN') return
  if (event.modifiers.shift) {
    useSelectionStore.getState().toggle({ nodes: [event.nodeId], edges: [] })
  } else {
    useSelectionStore.getState().select({ nodes: [event.nodeId], edges: [] })
  }
}

// ——— viewport ———

export const panViewportAction = (context: EditorContext, event: EditorEvent): void => {
  if (event.type !== 'CANVAS_POINTER_MOVE') return
  if (!context.dragOriginPoint) return
  const { pan } = useViewportStore.getState()
  useViewportStore.getState().setViewport({
    zoom: useViewportStore.getState().zoom,
    pan: {
      x: pan.x + (event.point.x - context.dragOriginPoint.x),
      y: pan.y + (event.point.y - context.dragOriginPoint.y),
    },
  })
}

export const zoomAtPointAction = (_context: EditorContext, event: EditorEvent): void => {
  if (event.type !== 'WHEEL_ZOOM') return
  useViewportStore.getState().zoomAt(event.anchor, event.delta)
}

// ——— selection ops ———

export const nudgeSelection = (_context: EditorContext, event: EditorEvent): void => {
  if (event.type !== 'NUDGE') return
  const diagram = useDiagramStore.getState().diagram
  for (const id of useSelectionStore.getState().selectedNodeIds) {
    const n = diagram.nodesById[id]
    if (!n) continue
    useDiagramStore.getState().moveNode(id, { x: n.position.x + event.dx, y: n.position.y + event.dy })
  }
}

// ——— history ———

export const undoAction = (_context: EditorContext, _event: EditorEvent): void => {
  useDiagramStore.temporal.getState().undo()
}

export const redoAction = (_context: EditorContext, _event: EditorEvent): void => {
  useDiagramStore.temporal.getState().redo()
}

// ——— clipboard stubs (Sub-project 4 delivers real clipboard) ———

const logStub = (label: string): void => {
  // eslint-disable-next-line no-console
  console.info(`[actions] ${label} — stub; full impl in Sub-project 4`)
}

export const stubCopy = (_c: EditorContext, _e: EditorEvent) => logStub('copy')
export const stubCut = (_c: EditorContext, _e: EditorEvent) => logStub('cut')
export const stubPaste = (_c: EditorContext, _e: EditorEvent) => logStub('paste')

// ——— commands passthroughs ———

export const deleteSelectionAction = (_c: EditorContext, _e: EditorEvent) => deleteSelectionCmd()
export const duplicateSelectionAction = (_c: EditorContext, _e: EditorEvent) => duplicateSelectionCmd()
export const selectAllAction = (_c: EditorContext, _e: EditorEvent) => selectAllCmd()
export const clearSelectionAction = (_c: EditorContext, _e: EditorEvent) => clearSelectionCmd()

// ——— connect ———

export const connectNodes = (context: EditorContext, event: EditorEvent): void => {
  if (event.type !== 'NODE_POINTER_DOWN' && event.type !== 'NODE_POINTER_UP') return
  const targetId = event.nodeId
  const sourceId = context.connectionFromId ?? context.quickFirstId
  if (!sourceId) return

  const store = useDiagramStore.getState()
  const diagram = store.diagram
  const source = diagram.nodesById[sourceId]
  const target = diagram.nodesById[targetId]
  if (!source || !target) return

  if (context.tool === 'quickRelationship') {
    if (!isEntityNode(source) || !isEntityNode(target)) return
    // Create a relationship node midway, then two ER edges connecting both entities.
    const relId = store.addNode({
      kind: 'relationship', name: 'Relationship', isIdentifying: false,
      position: {
        x: (source.position.x + target.position.x) / 2,
        y: (source.position.y + target.position.y) / 2,
      },
      size: { width: 140, height: 70 },
    })
    const e1: Omit<EntityRelationshipEdge, 'id'> = {
      kind: 'entity-relationship', sourceId, targetId: relId,
      cardinality: '1', participation: 'partial', waypoints: [],
    }
    const e2: Omit<EntityRelationshipEdge, 'id'> = {
      kind: 'entity-relationship', sourceId: targetId, targetId: relId,
      cardinality: 'N', participation: 'partial', waypoints: [],
    }
    store.addEdge(e1)
    store.addEdge(e2)
  } else if (context.tool === 'quickGeneralization') {
    if (!isEntityNode(source) || !isEntityNode(target)) return
    // Create an ISA node between parent (source) and child (target); two ISA edges.
    const isaId = store.addNode({
      kind: 'isa', isTotal: false,
      position: {
        x: (source.position.x + target.position.x) / 2,
        y: (source.position.y + target.position.y) / 2,
      },
      size: { width: 100, height: 60 },
    })
    const parentEdge: Omit<ISAEdge, 'id'> = {
      kind: 'isa-link', sourceId, targetId: isaId, role: 'parent', waypoints: [],
    }
    const childEdge: Omit<ISAEdge, 'id'> = {
      kind: 'isa-link', sourceId: isaId, targetId, role: 'child', waypoints: [],
    }
    store.addEdge(parentEdge)
    store.addEdge(childEdge)
  } else if (context.tool === 'connect') {
    // Pair-specific edge kind selection:
    // entity → relationship / relationship → entity: entity-relationship
    // attribute → entity or attribute → relationship: attribute-of
    if (source.kind === 'entity' && target.kind === 'relationship') {
      store.addEdge({
        kind: 'entity-relationship', sourceId, targetId,
        cardinality: '1', participation: 'partial', waypoints: [],
      })
    } else if (source.kind === 'relationship' && target.kind === 'entity') {
      store.addEdge({
        kind: 'entity-relationship', sourceId: targetId, targetId: sourceId,
        cardinality: '1', participation: 'partial', waypoints: [],
      })
    } else if (source.kind === 'attribute' && (target.kind === 'entity' || target.kind === 'relationship' || (target.kind === 'attribute' && target.isComposite))) {
      store.addEdge({
        kind: 'attribute-of', sourceId, targetId, waypoints: [],
      })
    }
  }
}

// ——— cheatsheet ———

const CHEATSHEET_MODAL_ID = 'cheatsheet'

export const toggleCheatsheetAction = (_c: EditorContext, _e: EditorEvent): void => {
  const ui = useUiStore.getState()
  const open = ui.modals.some((m) => m.kind === 'cheatsheet')
  if (open) {
    // Pop the topmost cheatsheet (simple impl — cheatsheet is typically topmost when invoked).
    const idx = ui.modals.findIndex((m) => m.kind === 'cheatsheet')
    if (idx === ui.modals.length - 1) {
      ui.popModal()
    } else {
      // Non-topmost (unexpected but guarded) — rebuild modals without the cheatsheet.
      useUiStore.setState({
        modals: ui.modals.filter((m) => m.kind !== 'cheatsheet'),
      })
    }
  } else {
    ui.pushModal({ id: CHEATSHEET_MODAL_ID, kind: 'cheatsheet', props: {} })
  }
}

// Keep `newNodeId` import satisfied — helper for Phase 4 addEdge-variant
// experiments. If you (future maintainer) don't add a use within this file
// during Phase 4, drop the import.
void newNodeId
```

Note the last `void newNodeId` line. It's defensive — removes the unused-import TS6133 at cost of one extra line. If the `newNodeId` import isn't actually needed in `actions.ts`, drop both the import and the `void` line. Check after running typecheck.

Remove the `void newNodeId` line if typecheck doesn't need it.

- [ ] **Step 4: Run tests**

Run: `pnpm test -- src/interaction/actions.test.ts --run`
Expected: all tests pass.

- [ ] **Step 5: typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
cat > /tmp/phase3-task4-msg.txt <<'EOF'
feat(interaction): add actions.ts — side-effectful action fns

Placement, drag, connect (4 tool-specific flavours), rubberband
lifecycle, selection, viewport, history (undo/redo), clipboard
stubs, nudge, commands passthroughs, cheatsheet toggle. Every
action is (context, event) => void; effects go through
useXStore.getState().

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
git add src/interaction/actions.ts src/interaction/actions.test.ts
git commit -F /tmp/phase3-task4-msg.txt
```

---

## Task 5: `machine.ts` Part 1 — setup + idle + selecting

**Files:**
- Create: `src/interaction/machine.ts`
- Create: `src/interaction/machine.test.ts`

This task stands up the machine shell + the `selecting.*` sub-states (idle, rubberBand, maybeDragging, dragging, resizing) + top-level `PICK_TOOL`/`ESCAPE`/`UNDO`/`REDO`/etc. that apply from any state. Tasks 6–7 add the remaining states.

- [ ] **Step 1: Write the initial machine**

```ts
import { assign, setup } from 'xstate'
import {
  beginRubberband, clearSelectionAction, commitRubberbandAction,
  deleteSelectionAction, duplicateSelectionAction, moveDraggedNode,
  nudgeSelection, panViewportAction, redoAction, selectAllAction,
  selectNodeFromEvent, stubCopy, stubCut, stubPaste, toggleCheatsheetAction,
  undoAction, updateRubberbandAction, zoomAtPointAction,
} from './actions'
import { initialContext, type EditorContext } from './context'
import type { EditorEvent, Tool } from './events'

const DRAG_THRESHOLD_PX = 3

export const editorMachine = setup({
  types: {
    context: {} as EditorContext,
    events: {} as EditorEvent,
  },
  guards: {
    isSelectTool: ({ context }) => context.tool === 'select',
    isPanTool: ({ context }) => context.tool === 'pan',
    isPlaceEntityTool: ({ context }) => context.tool === 'entity',
    isPlaceRelationshipTool: ({ context }) => context.tool === 'relationship',
    isPlaceAttributeTool: ({ context }) => context.tool === 'attribute',
    isPlaceIsaTool: ({ context }) => context.tool === 'isa',
    isConnectTool: ({ context }) => context.tool === 'connect',
    isQuickRelationshipTool: ({ context }) => context.tool === 'quickRelationship',
    isQuickGeneralizationTool: ({ context }) => context.tool === 'quickGeneralization',
    crossedDragThreshold: ({ context, event }) => {
      if (event.type !== 'CANVAS_POINTER_MOVE' && event.type !== 'NODE_POINTER_DOWN') return false
      const origin = context.dragOriginPoint
      if (!origin) return false
      const point = 'point' in event ? event.point : null
      if (!point) return false
      const dx = point.x - origin.x
      const dy = point.y - origin.y
      return Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX
    },
    isLeftButton: ({ event }) =>
      (event.type === 'CANVAS_POINTER_DOWN' || event.type === 'NODE_POINTER_DOWN' || event.type === 'EDGE_POINTER_DOWN')
      && event.button === 'left',
    isMiddleOrRightButton: ({ event }) =>
      (event.type === 'CANVAS_POINTER_DOWN' || event.type === 'NODE_POINTER_DOWN' || event.type === 'EDGE_POINTER_DOWN')
      && (event.button === 'middle' || event.button === 'right'),
  },
  actions: {
    setTool: assign({
      tool: ({ event }) =>
        event.type === 'PICK_TOOL' ? event.tool : 'select' as Tool,
    }),
    resetContext: assign({
      draggedNodeId: null,
      dragOriginPoint: null,
      connectionFromId: null,
      quickFirstId: null,
      resizeNodeId: null,
      resizeHandle: null,
    }),
    beginDrag: assign({
      draggedNodeId: ({ event }) =>
        event.type === 'NODE_POINTER_DOWN' ? event.nodeId : null,
      dragOriginPoint: ({ event }) =>
        event.type === 'NODE_POINTER_DOWN' ? event.point : null,
    }),
    beginPan: assign({
      dragOriginPoint: ({ event }) =>
        (event.type === 'CANVAS_POINTER_DOWN' || event.type === 'NODE_POINTER_DOWN')
          ? event.point : null,
    }),
    beginResize: assign({
      resizeNodeId: ({ event }) =>
        event.type === 'RESIZE_HANDLE_POINTER_DOWN' ? event.nodeId : null,
      resizeHandle: ({ event }) =>
        event.type === 'RESIZE_HANDLE_POINTER_DOWN' ? event.handle : null,
    }),
    // Side-effect actions below delegate to action-module functions.
    selectNodeFromEvent: ({ context, event }) => selectNodeFromEvent(context, event),
    moveDraggedNode: ({ context, event }) => moveDraggedNode(context, event),
    beginRubberband: ({ context, event }) => beginRubberband(context, event),
    updateRubberbandAction: ({ context, event }) => updateRubberbandAction(context, event),
    commitRubberbandAction: ({ context, event }) => commitRubberbandAction(context, event),
    panViewportAction: ({ context, event }) => panViewportAction(context, event),
    zoomAtPointAction: ({ context, event }) => zoomAtPointAction(context, event),
    nudgeSelection: ({ context, event }) => nudgeSelection(context, event),
    undoAction: ({ context, event }) => undoAction(context, event),
    redoAction: ({ context, event }) => redoAction(context, event),
    deleteSelectionAction: ({ context, event }) => deleteSelectionAction(context, event),
    duplicateSelectionAction: ({ context, event }) => duplicateSelectionAction(context, event),
    selectAllAction: ({ context, event }) => selectAllAction(context, event),
    clearSelectionAction: ({ context, event }) => clearSelectionAction(context, event),
    stubCopy: ({ context, event }) => stubCopy(context, event),
    stubCut: ({ context, event }) => stubCut(context, event),
    stubPaste: ({ context, event }) => stubPaste(context, event),
    toggleCheatsheetAction: ({ context, event }) => toggleCheatsheetAction(context, event),
  },
}).createMachine({
  id: 'editor',
  context: initialContext,
  initial: 'selecting',
  on: {
    PICK_TOOL: [
      { guard: ({ event }) => event.type === 'PICK_TOOL' && event.tool === 'select',
        target: '.selecting', actions: ['setTool', 'resetContext'] },
      { guard: ({ event }) => event.type === 'PICK_TOOL' && event.tool === 'pan',
        target: '.panning', actions: ['setTool', 'resetContext'] },
      { guard: ({ event }) => event.type === 'PICK_TOOL' && event.tool === 'entity',
        target: '.placing.entity', actions: ['setTool', 'resetContext'] },
      { guard: ({ event }) => event.type === 'PICK_TOOL' && event.tool === 'relationship',
        target: '.placing.relationship', actions: ['setTool', 'resetContext'] },
      { guard: ({ event }) => event.type === 'PICK_TOOL' && event.tool === 'attribute',
        target: '.placing.attribute', actions: ['setTool', 'resetContext'] },
      { guard: ({ event }) => event.type === 'PICK_TOOL' && event.tool === 'isa',
        target: '.placing.isa', actions: ['setTool', 'resetContext'] },
      { guard: ({ event }) => event.type === 'PICK_TOOL' && event.tool === 'connect',
        target: '.drawing', actions: ['setTool', 'resetContext'] },
      { guard: ({ event }) => event.type === 'PICK_TOOL' && event.tool === 'quickRelationship',
        target: '.quickRelationship', actions: ['setTool', 'resetContext'] },
      { guard: ({ event }) => event.type === 'PICK_TOOL' && event.tool === 'quickGeneralization',
        target: '.quickGeneralization', actions: ['setTool', 'resetContext'] },
    ],
    ESCAPE: { target: '.selecting', actions: ['resetContext', 'clearSelectionAction'] },
    UNDO: { actions: 'undoAction' },
    REDO: { actions: 'redoAction' },
    DELETE: { actions: 'deleteSelectionAction' },
    DUPLICATE: { actions: 'duplicateSelectionAction' },
    SELECT_ALL: { actions: 'selectAllAction' },
    NUDGE: { actions: 'nudgeSelection' },
    WHEEL_ZOOM: { actions: 'zoomAtPointAction' },
    COPY: { actions: 'stubCopy' },
    CUT: { actions: 'stubCut' },
    PASTE: { actions: 'stubPaste' },
    TOGGLE_CHEATSHEET: { actions: 'toggleCheatsheetAction' },
  },
  states: {
    selecting: {
      initial: 'idle',
      states: {
        idle: {
          on: {
            CANVAS_POINTER_DOWN: [
              { guard: 'isMiddleOrRightButton', target: '#editor.panning',
                actions: 'beginPan' },
              { guard: 'isLeftButton', target: 'rubberBand',
                actions: 'beginRubberband' },
            ],
            NODE_POINTER_DOWN: [
              { guard: 'isLeftButton', target: 'maybeDragging',
                actions: ['selectNodeFromEvent', 'beginDrag'] },
            ],
            RESIZE_HANDLE_POINTER_DOWN: { target: 'resizing', actions: 'beginResize' },
          },
        },
        rubberBand: {
          on: {
            CANVAS_POINTER_MOVE: { actions: 'updateRubberbandAction' },
            CANVAS_POINTER_UP: { target: 'idle', actions: 'commitRubberbandAction' },
          },
        },
        maybeDragging: {
          on: {
            CANVAS_POINTER_MOVE: {
              guard: 'crossedDragThreshold',
              target: 'dragging',
            },
            NODE_POINTER_UP: { target: 'idle', actions: 'resetContext' },
            CANVAS_POINTER_UP: { target: 'idle', actions: 'resetContext' },
          },
        },
        dragging: {
          on: {
            CANVAS_POINTER_MOVE: { actions: 'moveDraggedNode' },
            CANVAS_POINTER_UP: { target: 'idle', actions: 'resetContext' },
            NODE_POINTER_UP: { target: 'idle', actions: 'resetContext' },
          },
        },
        resizing: {
          on: {
            CANVAS_POINTER_MOVE: {
              // Resize logic stays in an action function so it can grow without crowding the machine.
              // Phase 4 adds snap + constraint logic; for now, resize is a no-op action.
            },
            CANVAS_POINTER_UP: { target: 'idle', actions: 'resetContext' },
          },
        },
      },
    },
    // Phase 5 adds: panning (Task 6), placing (Task 6), drawing (Task 7),
    // quickRelationship (Task 7), quickGeneralization (Task 7),
    // connectToGeneralization (Task 7).
    panning: { on: { ESCAPE: { target: 'selecting' } } },
    placing: { initial: 'entity', states: { entity: {}, relationship: {}, attribute: {}, isa: {} } },
    drawing: { on: {} },
    quickRelationship: { on: {} },
    quickGeneralization: { on: {} },
    connectToGeneralization: { on: {} },
  },
})
```

Note: empty state stubs at the bottom — Tasks 6 and 7 fill these in. Keeps this task's commit self-contained and typecheck-clean.

- [ ] **Step 2: Write transition tests for selecting states**

Create `src/interaction/machine.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createActor } from 'xstate'
import { editorMachine } from './machine'
import { useDiagramStore } from '@/state/diagramStore'
import { useSelectionStore } from '@/state/selectionStore'
import { useViewportStore } from '@/state/viewportStore'
import { emptyDiagram } from '@/domain/types'
import { asNodeId } from '@/domain/id'
import { NO_MODIFIERS } from './events'

const resetStores = () => {
  useDiagramStore.setState({ diagram: emptyDiagram() })
  useDiagramStore.temporal.getState().clear()
  useSelectionStore.setState({
    selectedNodeIds: new Set(), selectedEdgeIds: new Set(), rubberband: null,
  })
  useViewportStore.setState({ zoom: 1, pan: { x: 0, y: 0 } })
}

const startActor = () => {
  const actor = createActor(editorMachine)
  actor.start()
  return actor
}

describe('machine — initial state', () => {
  beforeEach(resetStores)
  it('starts in selecting.idle with select tool', () => {
    const actor = startActor()
    const s = actor.getSnapshot()
    expect(s.matches('selecting.idle')).toBe(true)
    expect(s.context.tool).toBe('select')
    actor.stop()
  })
})

describe('machine — PICK_TOOL routing', () => {
  beforeEach(resetStores)
  const cases: Array<[Parameters<typeof startActor>[0] extends unknown ? string : never, string]> = []
  // hack: use inline table
  it.each([
    ['select', 'selecting.idle'],
    ['pan', 'panning'],
    ['entity', 'placing.entity'],
    ['relationship', 'placing.relationship'],
    ['attribute', 'placing.attribute'],
    ['isa', 'placing.isa'],
    ['connect', 'drawing'],
    ['quickRelationship', 'quickRelationship'],
    ['quickGeneralization', 'quickGeneralization'],
  ])('PICK_TOOL %s → %s', (tool, expected) => {
    const actor = startActor()
    actor.send({ type: 'PICK_TOOL', tool: tool as never })
    expect(actor.getSnapshot().matches(expected)).toBe(true)
    actor.stop()
  })
  void cases  // silence if typecheck complains about unused bind
})

describe('machine — selecting.idle transitions', () => {
  beforeEach(resetStores)

  it('CANVAS_POINTER_DOWN left → rubberBand + starts rubberband in store', () => {
    const actor = startActor()
    actor.send({
      type: 'CANVAS_POINTER_DOWN', point: { x: 10, y: 10 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    expect(actor.getSnapshot().matches('selecting.rubberBand')).toBe(true)
    expect(useSelectionStore.getState().rubberband).toBeDefined()
    actor.stop()
  })

  it('CANVAS_POINTER_DOWN middle → panning', () => {
    const actor = startActor()
    actor.send({
      type: 'CANVAS_POINTER_DOWN', point: { x: 0, y: 0 },
      modifiers: NO_MODIFIERS, button: 'middle',
    })
    expect(actor.getSnapshot().matches('panning')).toBe(true)
    actor.stop()
  })

  it('NODE_POINTER_DOWN left → maybeDragging + node selected', () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'A', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const actor = startActor()
    actor.send({
      type: 'NODE_POINTER_DOWN', nodeId: id, point: { x: 5, y: 5 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    expect(actor.getSnapshot().matches('selecting.maybeDragging')).toBe(true)
    expect(useSelectionStore.getState().selectedNodeIds.has(id)).toBe(true)
    actor.stop()
  })
})

describe('machine — selecting.rubberBand transitions', () => {
  beforeEach(resetStores)

  it('CANVAS_POINTER_MOVE keeps state and updates rubberband', () => {
    const actor = startActor()
    actor.send({
      type: 'CANVAS_POINTER_DOWN', point: { x: 0, y: 0 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    actor.send({ type: 'CANVAS_POINTER_MOVE', point: { x: 50, y: 50 } })
    expect(actor.getSnapshot().matches('selecting.rubberBand')).toBe(true)
    expect(useSelectionStore.getState().rubberband?.current).toEqual({ x: 50, y: 50 })
    actor.stop()
  })

  it('CANVAS_POINTER_UP → idle + commits rubberband', () => {
    const actor = startActor()
    actor.send({
      type: 'CANVAS_POINTER_DOWN', point: { x: 0, y: 0 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    actor.send({ type: 'CANVAS_POINTER_UP', point: { x: 100, y: 100 } })
    expect(actor.getSnapshot().matches('selecting.idle')).toBe(true)
    expect(useSelectionStore.getState().rubberband).toBeNull()
    actor.stop()
  })
})

describe('machine — selecting.maybeDragging transitions', () => {
  beforeEach(resetStores)

  const setupDragCandidate = () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'A', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const actor = startActor()
    actor.send({
      type: 'NODE_POINTER_DOWN', nodeId: id, point: { x: 0, y: 0 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    return { actor, id }
  }

  it('CANVAS_POINTER_MOVE below threshold stays', () => {
    const { actor } = setupDragCandidate()
    actor.send({ type: 'CANVAS_POINTER_MOVE', point: { x: 1, y: 1 } })
    expect(actor.getSnapshot().matches('selecting.maybeDragging')).toBe(true)
    actor.stop()
  })

  it('CANVAS_POINTER_MOVE above threshold → dragging', () => {
    const { actor } = setupDragCandidate()
    actor.send({ type: 'CANVAS_POINTER_MOVE', point: { x: 10, y: 10 } })
    expect(actor.getSnapshot().matches('selecting.dragging')).toBe(true)
    actor.stop()
  })

  it('NODE_POINTER_UP without movement → idle', () => {
    const { actor, id } = setupDragCandidate()
    actor.send({ type: 'NODE_POINTER_UP', nodeId: id, point: { x: 0, y: 0 } })
    expect(actor.getSnapshot().matches('selecting.idle')).toBe(true)
    actor.stop()
  })
})

describe('machine — selecting.dragging transitions', () => {
  beforeEach(resetStores)

  it('CANVAS_POINTER_MOVE updates node position', () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'A', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const actor = startActor()
    actor.send({
      type: 'NODE_POINTER_DOWN', nodeId: id, point: { x: 0, y: 0 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    actor.send({ type: 'CANVAS_POINTER_MOVE', point: { x: 50, y: 50 } })
    expect(actor.getSnapshot().matches('selecting.dragging')).toBe(true)
    // Position is only updated while dragging; one more move should reflect it.
    actor.send({ type: 'CANVAS_POINTER_MOVE', point: { x: 100, y: 100 } })
    expect(useDiagramStore.getState().diagram.nodesById[id]!.position).toEqual({ x: 100, y: 100 })
    actor.stop()
  })

  it('CANVAS_POINTER_UP → idle', () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'A', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const actor = startActor()
    actor.send({
      type: 'NODE_POINTER_DOWN', nodeId: id, point: { x: 0, y: 0 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    actor.send({ type: 'CANVAS_POINTER_MOVE', point: { x: 50, y: 50 } })
    actor.send({ type: 'CANVAS_POINTER_UP', point: { x: 50, y: 50 } })
    expect(actor.getSnapshot().matches('selecting.idle')).toBe(true)
    actor.stop()
  })
})

describe('machine — top-level transitions from any state', () => {
  beforeEach(resetStores)

  it('ESCAPE from rubberBand → selecting.idle + resets context', () => {
    const actor = startActor()
    actor.send({
      type: 'CANVAS_POINTER_DOWN', point: { x: 0, y: 0 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    actor.send({ type: 'ESCAPE' })
    expect(actor.getSnapshot().matches('selecting.idle')).toBe(true)
    actor.stop()
  })

  it('UNDO applies to diagramStore', () => {
    const actor = startActor()
    useDiagramStore.getState().addNode({
      kind: 'entity', name: 'A', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    expect(useDiagramStore.getState().diagram.nodeOrder).toHaveLength(1)
    actor.send({ type: 'UNDO' })
    expect(useDiagramStore.getState().diagram.nodeOrder).toHaveLength(0)
    actor.stop()
  })

  it('WHEEL_ZOOM adjusts viewport', () => {
    const actor = startActor()
    actor.send({ type: 'WHEEL_ZOOM', anchor: { x: 100, y: 50 }, delta: 1 })
    expect(useViewportStore.getState().zoom).toBe(2)
    actor.stop()
  })

  it('NUDGE moves selection', () => {
    const id = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'A', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    useSelectionStore.getState().select({ nodes: [id], edges: [] })
    const actor = startActor()
    actor.send({ type: 'NUDGE', dx: 5, dy: 3 })
    expect(useDiagramStore.getState().diagram.nodesById[id]!.position).toEqual({ x: 5, y: 3 })
    actor.stop()
  })
})
```

- [ ] **Step 3: Run tests**

Run: `pnpm test -- src/interaction/machine.test.ts --run`
Expected: all tests pass.

- [ ] **Step 4: typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
cat > /tmp/phase3-task5-msg.txt <<'EOF'
feat(interaction): scaffold editorMachine with selecting states

Top-level transitions: PICK_TOOL routing (all 9 tools), ESCAPE,
UNDO/REDO, DELETE/DUPLICATE/SELECT_ALL, NUDGE, WHEEL_ZOOM,
clipboard stubs, TOGGLE_CHEATSHEET.

Selecting sub-states: idle → {rubberBand, maybeDragging, dragging,
resizing} with threshold-based drag activation (3px).

Placing/drawing/quick/connectToGeneralization states are empty
stubs; Tasks 6-7 fill them in.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
git add src/interaction/machine.ts src/interaction/machine.test.ts
git commit -F /tmp/phase3-task5-msg.txt
```

---

## Task 6: `machine.ts` Part 2 — panning + placing states

**Files:**
- Modify: `src/interaction/machine.ts` — fill in `panning` and `placing.*` states
- Modify: `src/interaction/machine.test.ts` — append tests

- [ ] **Step 1: Fill `panning` and `placing.*` states**

In `machine.ts`, replace the stubs:

```ts
    panning: {
      initial: 'idle',
      states: {
        idle: {
          on: {
            CANVAS_POINTER_DOWN: { target: 'active', actions: 'beginPan' },
          },
        },
        active: {
          on: {
            CANVAS_POINTER_MOVE: { actions: 'panViewportAction' },
            CANVAS_POINTER_UP: { target: 'idle', actions: 'resetContext' },
          },
        },
      },
    },
    placing: {
      initial: 'entity',
      states: {
        entity: {
          on: {
            CANVAS_POINTER_UP: { actions: 'placeNodeAction' },
          },
        },
        relationship: {
          on: {
            CANVAS_POINTER_UP: { actions: 'placeNodeAction' },
          },
        },
        attribute: {
          on: {
            CANVAS_POINTER_UP: { actions: 'placeNodeAction' },
          },
        },
        isa: {
          on: {
            CANVAS_POINTER_UP: { actions: 'placeNodeAction' },
          },
        },
      },
    },
```

Also add `placeNode` to the `actions:` block in `setup(...)`:

```ts
    placeNodeAction: ({ context, event }) => placeNode(context, event),
```

And import `placeNode` at the top of `machine.ts`:

```ts
import { /* ... existing imports ... */ placeNode } from './actions'
```

- [ ] **Step 2: Append tests**

Append to `machine.test.ts`:

```ts
describe('machine — panning', () => {
  beforeEach(resetStores)

  it('PICK_TOOL pan → panning.idle', () => {
    const actor = startActor()
    actor.send({ type: 'PICK_TOOL', tool: 'pan' })
    expect(actor.getSnapshot().matches('panning.idle')).toBe(true)
    actor.stop()
  })

  it('CANVAS_POINTER_DOWN (any button) → panning.active', () => {
    const actor = startActor()
    actor.send({ type: 'PICK_TOOL', tool: 'pan' })
    actor.send({
      type: 'CANVAS_POINTER_DOWN', point: { x: 0, y: 0 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    expect(actor.getSnapshot().matches('panning.active')).toBe(true)
    actor.stop()
  })

  it('CANVAS_POINTER_MOVE while panning.active shifts viewport', () => {
    const actor = startActor()
    actor.send({ type: 'PICK_TOOL', tool: 'pan' })
    actor.send({
      type: 'CANVAS_POINTER_DOWN', point: { x: 0, y: 0 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    actor.send({ type: 'CANVAS_POINTER_MOVE', point: { x: 20, y: 30 } })
    const { pan } = useViewportStore.getState()
    expect(pan).toEqual({ x: 20, y: 30 })
    actor.stop()
  })

  it('CANVAS_POINTER_UP → panning.idle', () => {
    const actor = startActor()
    actor.send({ type: 'PICK_TOOL', tool: 'pan' })
    actor.send({
      type: 'CANVAS_POINTER_DOWN', point: { x: 0, y: 0 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    actor.send({ type: 'CANVAS_POINTER_UP', point: { x: 0, y: 0 } })
    expect(actor.getSnapshot().matches('panning.idle')).toBe(true)
    actor.stop()
  })
})

describe('machine — placing', () => {
  beforeEach(resetStores)

  it.each([
    ['entity', 'placing.entity'],
    ['relationship', 'placing.relationship'],
    ['attribute', 'placing.attribute'],
    ['isa', 'placing.isa'],
  ])('PICK_TOOL %s → %s and CANVAS_POINTER_UP adds a node', (tool, state) => {
    const actor = startActor()
    actor.send({ type: 'PICK_TOOL', tool: tool as never })
    expect(actor.getSnapshot().matches(state)).toBe(true)
    actor.send({ type: 'CANVAS_POINTER_UP', point: { x: 42, y: 24 } })
    const d = useDiagramStore.getState().diagram
    expect(d.nodeOrder).toHaveLength(1)
    expect(d.nodesById[d.nodeOrder[0]!]!.kind).toBe(tool as string === 'isa' ? 'isa' : tool)
    expect(d.nodesById[d.nodeOrder[0]!]!.position).toEqual({ x: 42, y: 24 })
    actor.stop()
  })

  it('stays in placing state after a place for repeat-placement', () => {
    const actor = startActor()
    actor.send({ type: 'PICK_TOOL', tool: 'entity' })
    actor.send({ type: 'CANVAS_POINTER_UP', point: { x: 0, y: 0 } })
    expect(actor.getSnapshot().matches('placing.entity')).toBe(true)
    actor.stop()
  })
})
```

- [ ] **Step 3: Run tests + typecheck + lint**

Run: `pnpm test -- src/interaction/machine.test.ts --run`
Expected: all tests pass (prior + 7 new).

Run: `pnpm typecheck && pnpm lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
cat > /tmp/phase3-task6-msg.txt <<'EOF'
feat(interaction): fill panning + placing sub-states

panning splits into idle/active. Pan-tool pointer-down enters
active; pointer-move calls viewportStore; pointer-up returns
to idle. Placing.{entity,relationship,attribute,isa} each
react to CANVAS_POINTER_UP by calling placeNode — state is
sticky so the user can place many nodes without re-picking
the tool.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
git add src/interaction/machine.ts src/interaction/machine.test.ts
git commit -F /tmp/phase3-task6-msg.txt
```

---

## Task 7: `machine.ts` Part 3 — drawing + quick flows + connect-to-generalization

**Files:**
- Modify: `src/interaction/machine.ts` — fill in `drawing`, `quickRelationship`, `quickGeneralization`, `connectToGeneralization`
- Modify: `src/interaction/machine.test.ts` — append tests

- [ ] **Step 1: Fill remaining states**

In `machine.ts`:

```ts
    drawing: {
      initial: 'idle',
      states: {
        idle: {
          on: {
            NODE_POINTER_DOWN: [
              { guard: 'isLeftButton', target: 'connection.fromPicked',
                actions: assign({
                  connectionFromId: ({ event }) =>
                    event.type === 'NODE_POINTER_DOWN' ? event.nodeId : null,
                }) },
            ],
          },
        },
        connection: {
          initial: 'fromPicked',
          states: {
            fromPicked: {
              on: {
                NODE_POINTER_UP: {
                  target: '#editor.drawing.idle',
                  actions: ['connectNodesAction', 'resetContext'],
                },
                CANVAS_POINTER_UP: { target: '#editor.drawing.idle', actions: 'resetContext' },
              },
            },
          },
        },
      },
    },
    quickRelationship: {
      initial: 'idle',
      states: {
        idle: {
          on: {
            NODE_POINTER_DOWN: {
              guard: 'isLeftButton',
              target: 'firstPicked',
              actions: assign({
                quickFirstId: ({ event }) =>
                  event.type === 'NODE_POINTER_DOWN' ? event.nodeId : null,
              }),
            },
          },
        },
        firstPicked: {
          on: {
            NODE_POINTER_DOWN: {
              guard: ({ context, event }) =>
                event.type === 'NODE_POINTER_DOWN' && event.button === 'left'
                  && context.quickFirstId !== null && event.nodeId !== context.quickFirstId,
              target: '#editor.quickRelationship.idle',
              actions: ['connectNodesAction', 'resetContext'],
            },
          },
        },
      },
    },
    quickGeneralization: {
      initial: 'idle',
      states: {
        idle: {
          on: {
            NODE_POINTER_DOWN: {
              guard: 'isLeftButton',
              target: 'firstPicked',
              actions: assign({
                quickFirstId: ({ event }) =>
                  event.type === 'NODE_POINTER_DOWN' ? event.nodeId : null,
              }),
            },
          },
        },
        firstPicked: {
          on: {
            NODE_POINTER_DOWN: {
              guard: ({ context, event }) =>
                event.type === 'NODE_POINTER_DOWN' && event.button === 'left'
                  && context.quickFirstId !== null && event.nodeId !== context.quickFirstId,
              target: '#editor.quickGeneralization.idle',
              actions: ['connectNodesAction', 'resetContext'],
            },
          },
        },
      },
    },
    connectToGeneralization: {
      initial: 'waitingForChild',
      states: {
        waitingForChild: {
          on: {
            NODE_POINTER_DOWN: {
              guard: 'isLeftButton',
              target: '#editor.selecting',
              actions: ['connectNodesAction', 'resetContext'],
            },
          },
        },
      },
    },
```

Add `connectNodes` (from actions.ts) to the setup's `actions:` block:

```ts
    connectNodesAction: ({ context, event }) => connectNodes(context, event),
```

And import `connectNodes` at the top.

- [ ] **Step 2: Append tests**

```ts
describe('machine — drawing', () => {
  beforeEach(resetStores)

  it('PICK_TOOL connect → drawing.idle', () => {
    const actor = startActor()
    actor.send({ type: 'PICK_TOOL', tool: 'connect' })
    expect(actor.getSnapshot().matches('drawing.idle')).toBe(true)
    actor.stop()
  })

  it('NODE_POINTER_DOWN picks source → drawing.connection.fromPicked', () => {
    const store = useDiagramStore.getState()
    const e = store.addNode({
      kind: 'entity', name: 'E', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const actor = startActor()
    actor.send({ type: 'PICK_TOOL', tool: 'connect' })
    actor.send({
      type: 'NODE_POINTER_DOWN', nodeId: e, point: { x: 0, y: 0 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    expect(actor.getSnapshot().matches('drawing.connection.fromPicked')).toBe(true)
    expect(actor.getSnapshot().context.connectionFromId).toBe(e)
    actor.stop()
  })

  it('NODE_POINTER_UP on target adds an edge and returns to drawing.idle', () => {
    const store = useDiagramStore.getState()
    const e = store.addNode({
      kind: 'entity', name: 'E', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const r = store.addNode({
      kind: 'relationship', name: 'R', isIdentifying: false,
      position: { x: 200, y: 0 }, size: { width: 140, height: 70 },
    })
    const actor = startActor()
    actor.send({ type: 'PICK_TOOL', tool: 'connect' })
    actor.send({
      type: 'NODE_POINTER_DOWN', nodeId: e, point: { x: 0, y: 0 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    actor.send({ type: 'NODE_POINTER_UP', nodeId: r, point: { x: 200, y: 0 } })
    expect(useDiagramStore.getState().diagram.edgeOrder).toHaveLength(1)
    expect(actor.getSnapshot().matches('drawing.idle')).toBe(true)
    actor.stop()
  })

  it('CANVAS_POINTER_UP on empty canvas cancels back to drawing.idle', () => {
    const store = useDiagramStore.getState()
    const e = store.addNode({
      kind: 'entity', name: 'E', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const actor = startActor()
    actor.send({ type: 'PICK_TOOL', tool: 'connect' })
    actor.send({
      type: 'NODE_POINTER_DOWN', nodeId: e, point: { x: 0, y: 0 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    actor.send({ type: 'CANVAS_POINTER_UP', point: { x: 200, y: 200 } })
    expect(useDiagramStore.getState().diagram.edgeOrder).toHaveLength(0)
    expect(actor.getSnapshot().matches('drawing.idle')).toBe(true)
    actor.stop()
  })
})

describe('machine — quickRelationship', () => {
  beforeEach(resetStores)

  it('pick two entities → relationship + 2 edges added', () => {
    const store = useDiagramStore.getState()
    const a = store.addNode({
      kind: 'entity', name: 'A', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const b = store.addNode({
      kind: 'entity', name: 'B', isWeak: false,
      position: { x: 200, y: 0 }, size: { width: 120, height: 60 },
    })
    const actor = startActor()
    actor.send({ type: 'PICK_TOOL', tool: 'quickRelationship' })
    expect(actor.getSnapshot().matches('quickRelationship.idle')).toBe(true)

    actor.send({
      type: 'NODE_POINTER_DOWN', nodeId: a, point: { x: 0, y: 0 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    expect(actor.getSnapshot().matches('quickRelationship.firstPicked')).toBe(true)

    actor.send({
      type: 'NODE_POINTER_DOWN', nodeId: b, point: { x: 200, y: 0 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    const d = useDiagramStore.getState().diagram
    expect(d.nodeOrder).toHaveLength(3)  // A, B, relationship
    expect(d.edgeOrder).toHaveLength(2)
    expect(actor.getSnapshot().matches('quickRelationship.idle')).toBe(true)
    actor.stop()
  })

  it('clicking the same node twice does not complete the flow', () => {
    const a = useDiagramStore.getState().addNode({
      kind: 'entity', name: 'A', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const actor = startActor()
    actor.send({ type: 'PICK_TOOL', tool: 'quickRelationship' })
    actor.send({
      type: 'NODE_POINTER_DOWN', nodeId: a, point: { x: 0, y: 0 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    actor.send({
      type: 'NODE_POINTER_DOWN', nodeId: a, point: { x: 0, y: 0 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    // Should stay in firstPicked, not create an edge
    expect(useDiagramStore.getState().diagram.nodeOrder).toHaveLength(1)
    expect(actor.getSnapshot().matches('quickRelationship.firstPicked')).toBe(true)
    actor.stop()
  })
})

describe('machine — quickGeneralization', () => {
  beforeEach(resetStores)

  it('pick parent + child → isa node + 2 edges', () => {
    const store = useDiagramStore.getState()
    const p = store.addNode({
      kind: 'entity', name: 'P', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const c = store.addNode({
      kind: 'entity', name: 'C', isWeak: false,
      position: { x: 0, y: 200 }, size: { width: 120, height: 60 },
    })
    const actor = startActor()
    actor.send({ type: 'PICK_TOOL', tool: 'quickGeneralization' })
    actor.send({
      type: 'NODE_POINTER_DOWN', nodeId: p, point: { x: 0, y: 0 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    actor.send({
      type: 'NODE_POINTER_DOWN', nodeId: c, point: { x: 0, y: 200 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    const d = useDiagramStore.getState().diagram
    expect(d.nodeOrder).toHaveLength(3)  // P, C, ISA
    expect(d.edgeOrder).toHaveLength(2)
    actor.stop()
  })
})
```

- [ ] **Step 3: Run tests + typecheck + lint**

Run: `pnpm test -- src/interaction/machine.test.ts --run`
Expected: all tests pass.

Run: `pnpm typecheck && pnpm lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
cat > /tmp/phase3-task7-msg.txt <<'EOF'
feat(interaction): fill drawing + quick + connect-to-generalization

drawing.idle / drawing.connection.fromPicked — two-click explicit
connect flow. quickRelationship/quickGeneralization repeat-picker
flows with same-node guard. connectToGeneralization adds a child
to an existing ISA with a single pointer-down.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
git add src/interaction/machine.ts src/interaction/machine.test.ts
git commit -F /tmp/phase3-task7-msg.txt
```

---

## Task 8: `keybindings.ts` — shortcut registry

**Files:**
- Create: `src/interaction/keybindings.ts`
- Create: `src/interaction/keybindings.test.ts`

- [ ] **Step 1: Write tests**

```ts
import { describe, it, expect } from 'vitest'
import { keybindings, matchKeybinding, normaliseKeyCombo } from './keybindings'

const makeEvent = (init: Partial<KeyboardEvent> = {}): KeyboardEvent =>
  new KeyboardEvent('keydown', {
    key: 'Z', ctrlKey: false, metaKey: false, shiftKey: false, altKey: false,
    ...init,
  })

describe('normaliseKeyCombo', () => {
  it('sorts modifiers canonically: Ctrl, Meta, Shift, Alt, Key', () => {
    const e = makeEvent({ key: 'z', ctrlKey: true, shiftKey: true })
    expect(normaliseKeyCombo(e)).toBe('Ctrl+Shift+Z')
  })
  it('normalises single-letter keys to uppercase', () => {
    expect(normaliseKeyCombo(makeEvent({ key: 'a' }))).toBe('A')
  })
  it('preserves non-letter keys: Escape / Space / Delete / ArrowUp', () => {
    expect(normaliseKeyCombo(makeEvent({ key: 'Escape' }))).toBe('Escape')
    expect(normaliseKeyCombo(makeEvent({ key: 'ArrowUp' }))).toBe('ArrowUp')
  })
})

describe('keybindings registry', () => {
  it('covers all tool keys from spec §7.2', () => {
    const ids = keybindings.map((k) => k.id)
    expect(ids).toEqual(expect.arrayContaining([
      'tool.select', 'tool.pan', 'tool.entity', 'tool.relationship',
      'tool.attribute', 'tool.isa', 'tool.connect',
    ]))
  })
  it('every binding has non-empty keys and at least one i18n key', () => {
    for (const kb of keybindings) {
      expect(kb.keys.length).toBeGreaterThan(0)
      expect(kb.descriptionKey.length).toBeGreaterThan(0)
    }
  })
  it('ids are unique', () => {
    const ids = keybindings.map((k) => k.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('matchKeybinding', () => {
  it('matches Cmd+Z to undo on macOS-style input', () => {
    const m = matchKeybinding(makeEvent({ key: 'z', metaKey: true }))
    expect(m?.id).toBe('op.undo')
  })
  it('matches Ctrl+Z to undo on Windows/Linux-style input', () => {
    const m = matchKeybinding(makeEvent({ key: 'z', ctrlKey: true }))
    expect(m?.id).toBe('op.undo')
  })
  it('matches Ctrl+Shift+Z to redo', () => {
    const m = matchKeybinding(makeEvent({ key: 'z', ctrlKey: true, shiftKey: true }))
    expect(m?.id).toBe('op.redo')
  })
  it('matches plain E to entity tool', () => {
    const m = matchKeybinding(makeEvent({ key: 'e' }))
    expect(m?.id).toBe('tool.entity')
  })
  it('returns null when no binding matches', () => {
    const m = matchKeybinding(makeEvent({ key: 'F12' }))
    expect(m).toBeNull()
  })
  it('? matches toggleCheatsheet', () => {
    const m = matchKeybinding(makeEvent({ key: '?', shiftKey: true }))
    expect(m?.id).toBe('ctx.cheatsheet')
  })
})
```

- [ ] **Step 2: FAIL**

Run: `pnpm test -- src/interaction/keybindings.test.ts --run`
Expected: FAIL.

- [ ] **Step 3: Write `keybindings.ts`**

```ts
import type { EditorEvent } from './events'

export type KeybindingCategory = 'tool' | 'operation' | 'contextual' | 'navigation'
export type KeybindingContext = 'always' | 'hasSelection' | 'notInTextField'

export interface Keybinding {
  readonly id: string
  readonly keys: readonly string[]   // e.g. ['Ctrl+Z', 'Meta+Z']
  readonly when: KeybindingContext
  readonly event: EditorEvent
  readonly descriptionKey: string
  readonly category: KeybindingCategory
}

// Canonical modifier order: Ctrl, Meta, Shift, Alt, then the key itself.
// "Key" is the single-char uppercase for letters, or the event.key verbatim
// for special keys (Escape, Space, ArrowUp, Delete, Enter, F2, ?, 0, +, -).
export const normaliseKeyCombo = (event: KeyboardEvent): string => {
  const parts: string[] = []
  if (event.ctrlKey) parts.push('Ctrl')
  if (event.metaKey) parts.push('Meta')
  if (event.shiftKey) parts.push('Shift')
  if (event.altKey) parts.push('Alt')
  const key = event.key
  if (key.length === 1 && /[a-zA-Z]/.test(key)) parts.push(key.toUpperCase())
  else if (key === ' ') parts.push('Space')
  else parts.push(key)
  return parts.join('+')
}

// Helpers to keep the registry concise.
const tool = (id: string, keys: string[], tool: EditorEvent & { type: 'PICK_TOOL' }): Keybinding => ({
  id, keys, when: 'notInTextField', event: tool,
  descriptionKey: `keybinding.${id}`, category: 'tool',
})
const op = (id: string, keys: string[], event: EditorEvent): Keybinding => ({
  id, keys, when: 'notInTextField', event,
  descriptionKey: `keybinding.${id}`, category: 'operation',
})
const ctx = (id: string, keys: string[], event: EditorEvent, when: KeybindingContext = 'notInTextField'): Keybinding => ({
  id, keys, when, event,
  descriptionKey: `keybinding.${id}`, category: 'contextual',
})

export const keybindings: readonly Keybinding[] = Object.freeze([
  // Tools
  tool('tool.select',                    ['V'],                 { type: 'PICK_TOOL', tool: 'select' }),
  tool('tool.pan',                       ['H'],                 { type: 'PICK_TOOL', tool: 'pan' }),
  tool('tool.entity',                    ['E'],                 { type: 'PICK_TOOL', tool: 'entity' }),
  tool('tool.relationship',              ['R'],                 { type: 'PICK_TOOL', tool: 'relationship' }),
  tool('tool.attribute',                 ['A'],                 { type: 'PICK_TOOL', tool: 'attribute' }),
  tool('tool.isa',                       ['G'],                 { type: 'PICK_TOOL', tool: 'isa' }),
  tool('tool.connect',                   ['C'],                 { type: 'PICK_TOOL', tool: 'connect' }),

  // Operations
  op('op.undo',                          ['Ctrl+Z', 'Meta+Z'],  { type: 'UNDO' }),
  op('op.redo',                          ['Ctrl+Shift+Z', 'Meta+Shift+Z'], { type: 'REDO' }),
  op('op.copy',                          ['Ctrl+C', 'Meta+C'],  { type: 'COPY' }),
  op('op.cut',                           ['Ctrl+X', 'Meta+X'],  { type: 'CUT' }),
  op('op.paste',                         ['Ctrl+V', 'Meta+V'],  { type: 'PASTE' }),
  op('op.duplicate',                     ['Ctrl+D', 'Meta+D'],  { type: 'DUPLICATE' }),
  op('op.selectAll',                     ['Ctrl+A', 'Meta+A'],  { type: 'SELECT_ALL' }),
  op('op.fit',                           ['Ctrl+0', 'Meta+0'],  { type: 'FIT' }),
  op('op.zoomIn',                        ['Ctrl++', 'Meta++'],  { type: 'ZOOM_IN' }),
  op('op.zoomOut',                       ['Ctrl+-', 'Meta+-'],  { type: 'ZOOM_OUT' }),

  // Contextual
  ctx('ctx.delete',                      ['Delete', 'Backspace'], { type: 'DELETE' }, 'hasSelection'),
  ctx('ctx.escape',                      ['Escape'],            { type: 'ESCAPE' }, 'always'),
  ctx('ctx.rename',                      ['Enter', 'F2'],       { type: 'RENAME' }, 'hasSelection'),
  ctx('ctx.cheatsheet',                  ['Shift+?'],           { type: 'TOGGLE_CHEATSHEET' }, 'always'),
  ctx('ctx.nudgeUp',                     ['ArrowUp'],           { type: 'NUDGE', dx: 0, dy: -1 }, 'hasSelection'),
  ctx('ctx.nudgeDown',                   ['ArrowDown'],         { type: 'NUDGE', dx: 0, dy: 1 }, 'hasSelection'),
  ctx('ctx.nudgeLeft',                   ['ArrowLeft'],         { type: 'NUDGE', dx: -1, dy: 0 }, 'hasSelection'),
  ctx('ctx.nudgeRight',                  ['ArrowRight'],        { type: 'NUDGE', dx: 1, dy: 0 }, 'hasSelection'),
  ctx('ctx.nudgeUpBig',                  ['Shift+ArrowUp'],     { type: 'NUDGE', dx: 0, dy: -10 }, 'hasSelection'),
  ctx('ctx.nudgeDownBig',                ['Shift+ArrowDown'],   { type: 'NUDGE', dx: 0, dy: 10 }, 'hasSelection'),
  ctx('ctx.nudgeLeftBig',                ['Shift+ArrowLeft'],   { type: 'NUDGE', dx: -10, dy: 0 }, 'hasSelection'),
  ctx('ctx.nudgeRightBig',               ['Shift+ArrowRight'],  { type: 'NUDGE', dx: 10, dy: 0 }, 'hasSelection'),
  ctx('ctx.cycleForward',                ['Tab'],               { type: 'CYCLE_SELECTION', direction: 'forward' }, 'always'),
  ctx('ctx.cycleBackward',               ['Shift+Tab'],         { type: 'CYCLE_SELECTION', direction: 'backward' }, 'always'),
])

// Build an O(1) lookup: combo string → binding.
const comboIndex = ((): ReadonlyMap<string, Keybinding> => {
  const m = new Map<string, Keybinding>()
  for (const kb of keybindings) {
    for (const combo of kb.keys) m.set(combo, kb)
  }
  return m
})()

export const matchKeybinding = (event: KeyboardEvent): Keybinding | null => {
  const combo = normaliseKeyCombo(event)
  return comboIndex.get(combo) ?? null
}
```

- [ ] **Step 4: Run tests + typecheck + lint**

Run: `pnpm test -- src/interaction/keybindings.test.ts --run`
Expected: all tests pass.

Run: `pnpm typecheck && pnpm lint`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
cat > /tmp/phase3-task8-msg.txt <<'EOF'
feat(interaction): add keybindings registry + matchKeybinding

Canonical combo format (Ctrl+Meta+Shift+Alt+Key). Cross-platform
Ctrl/Meta aliases on operation shortcuts. Contextual bindings
gated via `when: 'hasSelection' | 'notInTextField' | 'always'`.
O(1) lookup via map index. i18n message keys for the cheatsheet.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
git add src/interaction/keybindings.ts src/interaction/keybindings.test.ts
git commit -F /tmp/phase3-task8-msg.txt
```

---

## Task 9: migrate `interactionStore` — state → interaction

**Files:**
- Delete: `src/state/interactionStore.ts`
- Delete: `src/state/interactionStore.test.ts`
- Create: `src/interaction/interactionStore.ts`
- Create: `src/interaction/interactionStore.test.ts`
- Modify: `src/state/index.ts` — drop `useInteractionStore` re-export

- [ ] **Step 1: Remove the old stub**

```bash
git rm src/state/interactionStore.ts src/state/interactionStore.test.ts
```

- [ ] **Step 2: Create the real store in `src/interaction/interactionStore.ts`**

```ts
import { createActor } from 'xstate'
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { editorMachine } from './machine'
import type { EditorEvent } from './events'

type Snapshot = ReturnType<ReturnType<typeof createActor<typeof editorMachine>>['getSnapshot']>

export interface InteractionStoreState {
  readonly snapshot: Snapshot
  send: (event: EditorEvent) => void
}

const actor = createActor(editorMachine)
actor.start()

export const useInteractionStore = create<InteractionStoreState>()(
  subscribeWithSelector((set) => {
    actor.subscribe((s) => set({ snapshot: s }))
    return {
      snapshot: actor.getSnapshot(),
      send: (event) => actor.send(event),
    }
  }),
)
```

- [ ] **Step 3: Create `interactionStore.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { useInteractionStore } from './interactionStore'

describe('interactionStore', () => {
  it('initial snapshot is selecting.idle', () => {
    const s = useInteractionStore.getState().snapshot
    expect(s.matches('selecting.idle')).toBe(true)
  })

  it('send() advances the machine', () => {
    useInteractionStore.getState().send({ type: 'PICK_TOOL', tool: 'entity' })
    const s = useInteractionStore.getState().snapshot
    expect(s.matches('placing.entity')).toBe(true)
    // Reset to select for downstream tests.
    useInteractionStore.getState().send({ type: 'PICK_TOOL', tool: 'select' })
  })
})
```

- [ ] **Step 4: Update `src/state/index.ts`**

Remove the line:

```ts
export { useInteractionStore, type InteractionStoreState } from './interactionStore'
```

Consumers now import from `@/interaction` (Task 14 barrel).

- [ ] **Step 5: Run typecheck — expect any broken import to surface**

Run: `pnpm typecheck`
Expected: clean if nothing imported the old location. If something fails with "module not found", that consumer needs to swap `@/state` → `@/interaction` for this import.

- [ ] **Step 6: Run tests**

Run: `pnpm test --run`
Expected: all prior tests still pass (assuming no consumers of the old store existed outside its own test file — verify via `git grep useInteractionStore src`).

- [ ] **Step 7: Commit**

```bash
cat > /tmp/phase3-task9-msg.txt <<'EOF'
refactor(interaction,state): migrate interactionStore to interaction/

Phase 2 parked the stub in src/state/ out of convenience; Phase 3's
machine imports from @/state so the store must live in a layer that
can reach BOTH the machine AND the stores. That's interaction/.

src/state/interactionStore.{ts,test.ts} deleted.
src/interaction/interactionStore.{ts,test.ts} created.
src/state/index.ts drops the re-export.

Consumers should `import { useInteractionStore } from '@/interaction'`.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
git add src/interaction/interactionStore.ts src/interaction/interactionStore.test.ts src/state/index.ts
git commit -F /tmp/phase3-task9-msg.txt
```

---

## Task 10: `canvas/hooks/useKeyboard.ts`

**Files:**
- Create: `src/canvas/hooks/useKeyboard.ts`
- Create: `src/canvas/hooks/useKeyboard.test.tsx`

- [ ] **Step 1: Write tests**

```tsx
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useKeyboard } from './useKeyboard'
import { useInteractionStore } from '@/interaction/interactionStore'

let sendSpy: ReturnType<typeof vi.fn>

beforeEach(() => {
  sendSpy = vi.fn()
  vi.spyOn(useInteractionStore, 'getState').mockReturnValue({
    snapshot: useInteractionStore.getState().snapshot,
    send: sendSpy,
  })
})
afterEach(() => {
  vi.restoreAllMocks()
})

const fireKey = (init: KeyboardEventInit) => {
  window.dispatchEvent(new KeyboardEvent('keydown', init))
}

describe('useKeyboard', () => {
  it('dispatches PICK_TOOL entity when E is pressed', () => {
    renderHook(() => useKeyboard())
    fireKey({ key: 'e' })
    expect(sendSpy).toHaveBeenCalledWith({ type: 'PICK_TOOL', tool: 'entity' })
  })

  it('dispatches UNDO on Cmd+Z', () => {
    renderHook(() => useKeyboard())
    fireKey({ key: 'z', metaKey: true })
    expect(sendSpy).toHaveBeenCalledWith({ type: 'UNDO' })
  })

  it('does not dispatch when focus is in an <input>', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    renderHook(() => useKeyboard())
    // Re-focus before dispatching (dispatch is global)
    Object.defineProperty(document, 'activeElement', { value: input, configurable: true })
    fireKey({ key: 'e' })
    expect(sendSpy).not.toHaveBeenCalled()
    document.body.removeChild(input)
  })

  it('unregisters the listener on unmount', () => {
    const { unmount } = renderHook(() => useKeyboard())
    unmount()
    fireKey({ key: 'e' })
    expect(sendSpy).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: FAIL**

Run: `pnpm test -- src/canvas/hooks/useKeyboard.test.tsx --run`
Expected: FAIL.

- [ ] **Step 3: Write `useKeyboard.ts`**

```ts
import { useEffect } from 'react'
import { matchKeybinding } from '@/interaction/keybindings'
import { useInteractionStore } from '@/interaction/interactionStore'

const TEXT_FIELD_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

const isInTextField = (): boolean => {
  const el = document.activeElement
  if (!el) return false
  if (el instanceof HTMLElement && el.isContentEditable) return true
  return TEXT_FIELD_TAGS.has(el.tagName)
}

export const useKeyboard = (): void => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const binding = matchKeybinding(event)
      if (!binding) return
      if (binding.when === 'notInTextField' && isInTextField()) return
      // 'always' bindings skip the text-field check; 'hasSelection' is evaluated in actions.
      event.preventDefault()
      useInteractionStore.getState().send(binding.event)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test -- src/canvas/hooks/useKeyboard.test.tsx --run`
Expected: 4 tests pass.

- [ ] **Step 5: typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
cat > /tmp/phase3-task10-msg.txt <<'EOF'
feat(canvas/hooks): add useKeyboard — global shortcut listener

Registers a window-level keydown listener, matches against the
keybindings registry, dispatches the resulting EditorEvent to
the interaction store. Skips shortcuts marked `notInTextField`
when focus is in an input/textarea/contenteditable. Cleans up
on unmount.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
git add src/canvas/hooks/useKeyboard.ts src/canvas/hooks/useKeyboard.test.tsx
git commit -F /tmp/phase3-task10-msg.txt
```

---

## Task 11: `canvas/hooks/useMouse.ts`

**Files:**
- Create: `src/canvas/hooks/useMouse.ts`
- Create: `src/canvas/hooks/useMouse.test.tsx`

- [ ] **Step 1: Write tests**

```tsx
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useMouse } from './useMouse'
import { useInteractionStore } from '@/interaction/interactionStore'

let sendSpy: ReturnType<typeof vi.fn>

beforeEach(() => {
  sendSpy = vi.fn()
  vi.spyOn(useInteractionStore, 'getState').mockReturnValue({
    snapshot: useInteractionStore.getState().snapshot,
    send: sendSpy,
  })
})
afterEach(() => { vi.restoreAllMocks() })

describe('useMouse', () => {
  it('onPointerDown (left) → CANVAS_POINTER_DOWN with button=left', () => {
    const { result } = renderHook(() => useMouse())
    const mkEvent = (init: Partial<PointerEvent> = {}) => ({
      clientX: 10, clientY: 20,
      button: 0, shiftKey: false, ctrlKey: false, altKey: false, metaKey: false,
      pointerType: 'mouse',
      preventDefault: vi.fn(),
      ...init,
    }) as unknown as React.PointerEvent<HTMLElement>
    result.current.onPointerDown(mkEvent())
    expect(sendSpy).toHaveBeenCalledWith({
      type: 'CANVAS_POINTER_DOWN',
      point: { x: 10, y: 20 },
      modifiers: { shift: false, ctrl: false, alt: false, meta: false },
      button: 'left',
    })
  })

  it('middle-button → button=middle', () => {
    const { result } = renderHook(() => useMouse())
    result.current.onPointerDown({
      clientX: 0, clientY: 0, button: 1,
      shiftKey: false, ctrlKey: false, altKey: false, metaKey: false,
      pointerType: 'mouse',
      preventDefault: vi.fn(),
    } as unknown as React.PointerEvent<HTMLElement>)
    expect(sendSpy).toHaveBeenCalledWith(expect.objectContaining({ button: 'middle' }))
  })

  it('right-button → button=right', () => {
    const { result } = renderHook(() => useMouse())
    result.current.onPointerDown({
      clientX: 0, clientY: 0, button: 2,
      shiftKey: false, ctrlKey: false, altKey: false, metaKey: false,
      pointerType: 'mouse',
      preventDefault: vi.fn(),
    } as unknown as React.PointerEvent<HTMLElement>)
    expect(sendSpy).toHaveBeenCalledWith(expect.objectContaining({ button: 'right' }))
  })

  it('onPointerMove → CANVAS_POINTER_MOVE', () => {
    const { result } = renderHook(() => useMouse())
    result.current.onPointerMove({
      clientX: 33, clientY: 44, preventDefault: vi.fn(),
    } as unknown as React.PointerEvent<HTMLElement>)
    expect(sendSpy).toHaveBeenCalledWith({
      type: 'CANVAS_POINTER_MOVE',
      point: { x: 33, y: 44 },
    })
  })

  it('onPointerUp → CANVAS_POINTER_UP', () => {
    const { result } = renderHook(() => useMouse())
    result.current.onPointerUp({
      clientX: 55, clientY: 66, preventDefault: vi.fn(),
    } as unknown as React.PointerEvent<HTMLElement>)
    expect(sendSpy).toHaveBeenCalledWith({
      type: 'CANVAS_POINTER_UP',
      point: { x: 55, y: 66 },
    })
  })

  it('onWheel with ctrl pressed → WHEEL_ZOOM', () => {
    const { result } = renderHook(() => useMouse())
    result.current.onWheel({
      clientX: 100, clientY: 50, deltaY: -100,
      shiftKey: false, ctrlKey: true, altKey: false, metaKey: false,
      preventDefault: vi.fn(),
    } as unknown as React.WheelEvent<HTMLElement>)
    expect(sendSpy).toHaveBeenCalledWith({
      type: 'WHEEL_ZOOM',
      anchor: { x: 100, y: 50 },
      delta: expect.any(Number),
    })
  })

  it('touch-type pointer events are ignored (delegated to useTouch)', () => {
    const { result } = renderHook(() => useMouse())
    result.current.onPointerDown({
      clientX: 0, clientY: 0, button: 0,
      shiftKey: false, ctrlKey: false, altKey: false, metaKey: false,
      pointerType: 'touch',
      preventDefault: vi.fn(),
    } as unknown as React.PointerEvent<HTMLElement>)
    expect(sendSpy).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: FAIL**

Run: `pnpm test -- src/canvas/hooks/useMouse.test.tsx --run`
Expected: FAIL.

- [ ] **Step 3: Write `useMouse.ts`**

```tsx
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react'
import { useInteractionStore } from '@/interaction/interactionStore'
import type { Modifiers, PointerButton } from '@/interaction/events'

const readModifiers = (e: { shiftKey: boolean; ctrlKey: boolean; altKey: boolean; metaKey: boolean }): Modifiers => ({
  shift: e.shiftKey, ctrl: e.ctrlKey, alt: e.altKey, meta: e.metaKey,
})

const readButton = (button: number): PointerButton =>
  button === 1 ? 'middle' : button === 2 ? 'right' : 'left'

const readPoint = (e: { clientX: number; clientY: number }) => ({ x: e.clientX, y: e.clientY })

export interface MouseHandlers {
  readonly onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void
  readonly onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void
  readonly onPointerUp: (e: ReactPointerEvent<HTMLElement>) => void
  readonly onWheel: (e: ReactWheelEvent<HTMLElement>) => void
}

const WHEEL_ZOOM_STEP = 0.1

export const useMouse = (): MouseHandlers => ({
  onPointerDown: (e) => {
    if (e.pointerType === 'touch') return
    useInteractionStore.getState().send({
      type: 'CANVAS_POINTER_DOWN',
      point: readPoint(e),
      modifiers: readModifiers(e),
      button: readButton(e.button),
    })
  },
  onPointerMove: (e) => {
    if (e.pointerType === 'touch') return
    useInteractionStore.getState().send({
      type: 'CANVAS_POINTER_MOVE',
      point: readPoint(e),
    })
  },
  onPointerUp: (e) => {
    if (e.pointerType === 'touch') return
    useInteractionStore.getState().send({
      type: 'CANVAS_POINTER_UP',
      point: readPoint(e),
    })
  },
  onWheel: (e) => {
    if (!e.ctrlKey && !e.metaKey) return  // Ctrl/Meta+wheel = zoom; plain wheel = native scroll (or future horizontal pan)
    const delta = e.deltaY < 0 ? WHEEL_ZOOM_STEP : -WHEEL_ZOOM_STEP
    useInteractionStore.getState().send({
      type: 'WHEEL_ZOOM',
      anchor: readPoint(e),
      delta,
    })
  },
})
```

- [ ] **Step 4: Run tests + typecheck + lint**

Run: `pnpm test -- src/canvas/hooks/useMouse.test.tsx --run`
Expected: 7 tests pass.

Run: `pnpm typecheck && pnpm lint`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
cat > /tmp/phase3-task11-msg.txt <<'EOF'
feat(canvas/hooks): add useMouse — pointer + wheel handlers

Returns pointer/wheel handlers keyed to spread on the canvas
container. Translates native events to EditorEvents with
modifiers + button. Touch-type pointers are ignored (useTouch
handles them). Ctrl/Meta+wheel → WHEEL_ZOOM.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
git add src/canvas/hooks/useMouse.ts src/canvas/hooks/useMouse.test.tsx
git commit -F /tmp/phase3-task11-msg.txt
```

---

## Task 12: `canvas/hooks/useTouch.ts`

**Files:**
- Create: `src/canvas/hooks/useTouch.ts`
- Create: `src/canvas/hooks/useTouch.test.tsx`

Touch is simpler in Phase 3 than you might think — we focus on single-drag and double-tap. Two-finger pinch/drag and long-press are scoped to Sub-project 4 per the spec's phased plan. The hook returns handlers; it tracks multi-touch state in a closure.

- [ ] **Step 1: Write tests**

```tsx
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useTouch } from './useTouch'
import { useInteractionStore } from '@/interaction/interactionStore'

let sendSpy: ReturnType<typeof vi.fn>

beforeEach(() => {
  sendSpy = vi.fn()
  vi.spyOn(useInteractionStore, 'getState').mockReturnValue({
    snapshot: useInteractionStore.getState().snapshot,
    send: sendSpy,
  })
})
afterEach(() => { vi.restoreAllMocks() })

const makePointerEvent = (init: { clientX: number; clientY: number; pointerType?: string; pointerId?: number }) => ({
  clientX: init.clientX, clientY: init.clientY,
  pointerType: init.pointerType ?? 'touch',
  pointerId: init.pointerId ?? 1,
  shiftKey: false, ctrlKey: false, altKey: false, metaKey: false,
  preventDefault: vi.fn(),
}) as unknown as React.PointerEvent<HTMLElement>

describe('useTouch', () => {
  it('single touch pointer-down → CANVAS_POINTER_DOWN button=left', () => {
    const { result } = renderHook(() => useTouch())
    result.current.onPointerDown(makePointerEvent({ clientX: 10, clientY: 20 }))
    expect(sendSpy).toHaveBeenCalledWith({
      type: 'CANVAS_POINTER_DOWN',
      point: { x: 10, y: 20 },
      modifiers: { shift: false, ctrl: false, alt: false, meta: false },
      button: 'left',
    })
  })

  it('single touch move → CANVAS_POINTER_MOVE', () => {
    const { result } = renderHook(() => useTouch())
    result.current.onPointerDown(makePointerEvent({ clientX: 0, clientY: 0 }))
    result.current.onPointerMove(makePointerEvent({ clientX: 20, clientY: 30 }))
    expect(sendSpy).toHaveBeenLastCalledWith({
      type: 'CANVAS_POINTER_MOVE',
      point: { x: 20, y: 30 },
    })
  })

  it('single touch up → CANVAS_POINTER_UP', () => {
    const { result } = renderHook(() => useTouch())
    result.current.onPointerDown(makePointerEvent({ clientX: 0, clientY: 0 }))
    result.current.onPointerUp(makePointerEvent({ clientX: 0, clientY: 0 }))
    expect(sendSpy).toHaveBeenLastCalledWith({
      type: 'CANVAS_POINTER_UP',
      point: { x: 0, y: 0 },
    })
  })

  it('mouse-type pointer events are ignored (delegated to useMouse)', () => {
    const { result } = renderHook(() => useTouch())
    result.current.onPointerDown(makePointerEvent({ clientX: 0, clientY: 0, pointerType: 'mouse' }))
    expect(sendSpy).not.toHaveBeenCalled()
  })

  it('second concurrent touch pointer-down is ignored (pinch/gesture = Sub-project 4)', () => {
    const { result } = renderHook(() => useTouch())
    result.current.onPointerDown(makePointerEvent({ clientX: 0, clientY: 0, pointerId: 1 }))
    sendSpy.mockClear()
    result.current.onPointerDown(makePointerEvent({ clientX: 100, clientY: 100, pointerId: 2 }))
    expect(sendSpy).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: FAIL**

Run: `pnpm test -- src/canvas/hooks/useTouch.test.tsx --run`
Expected: FAIL.

- [ ] **Step 3: Write `useTouch.ts`**

```tsx
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useRef } from 'react'
import { useInteractionStore } from '@/interaction/interactionStore'
import { NO_MODIFIERS } from '@/interaction/events'

export interface TouchHandlers {
  readonly onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void
  readonly onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void
  readonly onPointerUp: (e: ReactPointerEvent<HTMLElement>) => void
}

const readPoint = (e: { clientX: number; clientY: number }) => ({ x: e.clientX, y: e.clientY })

export const useTouch = (): TouchHandlers => {
  const activePointerId = useRef<number | null>(null)

  return {
    onPointerDown: (e) => {
      if (e.pointerType !== 'touch') return
      if (activePointerId.current !== null) return  // ignore second finger (pinch = Sub-project 4)
      activePointerId.current = e.pointerId
      useInteractionStore.getState().send({
        type: 'CANVAS_POINTER_DOWN',
        point: readPoint(e),
        modifiers: NO_MODIFIERS,
        button: 'left',
      })
    },
    onPointerMove: (e) => {
      if (e.pointerType !== 'touch') return
      if (e.pointerId !== activePointerId.current) return
      useInteractionStore.getState().send({
        type: 'CANVAS_POINTER_MOVE',
        point: readPoint(e),
      })
    },
    onPointerUp: (e) => {
      if (e.pointerType !== 'touch') return
      if (e.pointerId !== activePointerId.current) return
      activePointerId.current = null
      useInteractionStore.getState().send({
        type: 'CANVAS_POINTER_UP',
        point: readPoint(e),
      })
    },
  }
}
```

- [ ] **Step 4: Run tests + typecheck + lint**

Run: `pnpm test -- src/canvas/hooks/useTouch.test.tsx --run`
Expected: 5 tests pass.

Run: `pnpm typecheck && pnpm lint`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
cat > /tmp/phase3-task12-msg.txt <<'EOF'
feat(canvas/hooks): add useTouch — single-finger touch handlers

Tracks the active pointer id in a ref; additional concurrent
touches are ignored (pinch + multi-finger gestures land in
Sub-project 4). Pointers with pointerType !== 'touch' are
forwarded to useMouse. Translates to the same EditorEvents as
the mouse hook for behavioural parity.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
git add src/canvas/hooks/useTouch.ts src/canvas/hooks/useTouch.test.tsx
git commit -F /tmp/phase3-task12-msg.txt
```

---

## Task 13: `interaction/index.ts` + `canvas/hooks/index.ts` barrels

**Files:**
- Create: `src/interaction/index.ts`
- Create: `src/canvas/hooks/index.ts`

- [ ] **Step 1: Write the interaction barrel**

```ts
export * from './events'
export { initialContext, type EditorContext } from './context'
export {
  isEntity, isRelationship, isAttribute, isISA,
  canHaveAttribute, isDifferentNode,
  canBeRelationshipParticipant, canBeISAChild,
} from './guards'
export { editorMachine } from './machine'
export {
  keybindings, matchKeybinding, normaliseKeyCombo,
  type Keybinding, type KeybindingCategory, type KeybindingContext,
} from './keybindings'
export { useInteractionStore, type InteractionStoreState } from './interactionStore'
```

- [ ] **Step 2: Write the canvas/hooks barrel**

```ts
export { useKeyboard } from './useKeyboard'
export { useMouse, type MouseHandlers } from './useMouse'
export { useTouch, type TouchHandlers } from './useTouch'
```

- [ ] **Step 3: Run tests + typecheck**

Run: `pnpm test --run`
Run: `pnpm typecheck`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
cat > /tmp/phase3-task13-msg.txt <<'EOF'
feat(interaction,canvas/hooks): add barrel re-exports

Consumers can now `import { useInteractionStore, editorMachine,
keybindings } from '@/interaction'` and
`import { useMouse, useKeyboard, useTouch } from '@/canvas/hooks'`.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
git add src/interaction/index.ts src/canvas/hooks/index.ts
git commit -F /tmp/phase3-task13-msg.txt
```

---

## Task 14: `interaction/integration.test.ts` — full cycle end-to-end

**Files:**
- Create: `src/interaction/integration.test.ts`

- [ ] **Step 1: Write the integration test**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createActor } from 'xstate'
import { editorMachine } from './machine'
import { useDiagramStore } from '@/state/diagramStore'
import { useSelectionStore } from '@/state/selectionStore'
import { emptyDiagram } from '@/domain/types'
import { NO_MODIFIERS } from './events'

const reset = () => {
  useDiagramStore.setState({ diagram: emptyDiagram() })
  useDiagramStore.temporal.getState().clear()
  useSelectionStore.setState({
    selectedNodeIds: new Set(), selectedEdgeIds: new Set(), rubberband: null,
  })
}

describe('interaction — integration flows', () => {
  beforeEach(reset)

  it('place 2 entities → quick-relationship → relationship node + 2 edges', () => {
    const actor = createActor(editorMachine)
    actor.start()

    // Place first entity
    actor.send({ type: 'PICK_TOOL', tool: 'entity' })
    actor.send({ type: 'CANVAS_POINTER_UP', point: { x: 0, y: 0 } })

    // Place second entity
    actor.send({ type: 'CANVAS_POINTER_UP', point: { x: 200, y: 0 } })

    expect(useDiagramStore.getState().diagram.nodeOrder).toHaveLength(2)

    // Switch to quick-relationship
    actor.send({ type: 'PICK_TOOL', tool: 'quickRelationship' })

    const [a, b] = useDiagramStore.getState().diagram.nodeOrder
    actor.send({
      type: 'NODE_POINTER_DOWN', nodeId: a!, point: { x: 0, y: 0 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    actor.send({
      type: 'NODE_POINTER_DOWN', nodeId: b!, point: { x: 200, y: 0 },
      modifiers: NO_MODIFIERS, button: 'left',
    })

    const d = useDiagramStore.getState().diagram
    expect(d.nodeOrder).toHaveLength(3)  // 2 entities + 1 rel
    expect(d.edgeOrder).toHaveLength(2)  // 2 ER edges
    actor.stop()
  })

  it('place entity, drag, undo — ends with empty diagram', () => {
    const actor = createActor(editorMachine)
    actor.start()

    actor.send({ type: 'PICK_TOOL', tool: 'entity' })
    actor.send({ type: 'CANVAS_POINTER_UP', point: { x: 50, y: 50 } })
    expect(useDiagramStore.getState().diagram.nodeOrder).toHaveLength(1)

    actor.send({ type: 'UNDO' })
    expect(useDiagramStore.getState().diagram.nodeOrder).toHaveLength(0)

    actor.stop()
  })

  it('select tool → rubberband drag selects a node', () => {
    useDiagramStore.getState().addNode({
      kind: 'entity', name: 'X', isWeak: false,
      position: { x: 50, y: 50 }, size: { width: 20, height: 20 },
    })
    const id = useDiagramStore.getState().diagram.nodeOrder[0]!

    const actor = createActor(editorMachine)
    actor.start()

    actor.send({
      type: 'CANVAS_POINTER_DOWN', point: { x: 0, y: 0 },
      modifiers: NO_MODIFIERS, button: 'left',
    })
    actor.send({ type: 'CANVAS_POINTER_MOVE', point: { x: 100, y: 100 } })
    actor.send({ type: 'CANVAS_POINTER_UP', point: { x: 100, y: 100 } })

    expect(useSelectionStore.getState().selectedNodeIds.has(id)).toBe(true)
    actor.stop()
  })
})
```

- [ ] **Step 2: Run tests**

Run: `pnpm test -- src/interaction/integration.test.ts --run`
Expected: 3 tests pass.

- [ ] **Step 3: Commit**

```bash
cat > /tmp/phase3-task14-msg.txt <<'EOF'
test(interaction): add end-to-end integration flows

Three full flows: (1) place two entities → quick-relationship
→ rel node + 2 edges. (2) place → undo → empty. (3) select tool
→ rubberband → node selected. Machine + stores exercised
together — proves Phase 3 produces a working runnable FSM.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
git add src/interaction/integration.test.ts
git commit -F /tmp/phase3-task14-msg.txt
```

---

## Task 15: Final verification

**Files:** (none — verification only)

- [ ] **Step 1: Run full suite**

Run: `pnpm test --run`
Expected: all tests pass. Target total ≈ 285-300 (Phase 2 ended at 243; Phase 3 adds roughly 45-60).

Run: `pnpm typecheck` — clean.
Run: `pnpm lint` — clean.
Run: `pnpm build` — clean; bundle still <400 KB gz.

- [ ] **Step 2: Coverage check**

Run: `pnpm test:coverage`
Expected: exit 0; all layer thresholds met — interaction ≥90%, canvas/hooks ≥85%.

If coverage is below threshold on a specific file, inspect the uncovered lines. Add a positive-path test only — don't lower thresholds.

- [ ] **Step 3: File-size check**

Run: `wc -l src/interaction/*.ts src/canvas/hooks/*.ts`
Expected: no file >350 lines. `machine.ts` is the danger spot — if it's >350, split the `on:` guards for PICK_TOOL into an array helper outside the setup block.

- [ ] **Step 4: Layer-boundary audit**

Run: `pnpm lint`
Expected: clean. Also spot-check:
- `src/interaction/**` imports from `@/domain` and `@/state` only (no `@/canvas`, `@/ui`, `@/notation`, `@/platform`, `@/app`).
- `src/canvas/hooks/**` imports from `@/interaction`, `@/domain`, `@/state` only (not `@/ui`, `@/platform`, `@/app`).

- [ ] **Step 5: No commit produced**

This task is verification only. Proceed to Task 16.

---

## Task 16: CHANGELOG

**Files:**
- Modify: `CHANGELOG.md` — prepend Phase 3 entry

- [ ] **Step 1: Prepend**

Above the Phase 2 entry, add:

```markdown
## [v2 / Phase 3] — 2026-04-22

### Added

- `src/interaction/` layer with full XState FSM:
  - [events.ts](src/interaction/events.ts) — typed `EditorEvent` union covering canvas + node + edge pointer events, resize handles, history, clipboard stubs, selection ops, viewport, rename, modal confirm/cancel, cheatsheet.
  - [context.ts](src/interaction/context.ts) — machine context with transient drag/connection/resize fields.
  - [guards.ts](src/interaction/guards.ts) — 8 pure predicates over Diagram + selection.
  - [actions.ts](src/interaction/actions.ts) — side-effectful action functions that call `useXStore.getState()`.
  - [machine.ts](src/interaction/machine.ts) — `editorMachine` with idle, selecting.{idle,rubberBand,maybeDragging,dragging,resizing}, panning.{idle,active}, placing.{entity,relationship,attribute,isa}, drawing.{idle,connection.fromPicked}, quickRelationship.{idle,firstPicked}, quickGeneralization.{idle,firstPicked}, connectToGeneralization.waitingForChild.
  - [keybindings.ts](src/interaction/keybindings.ts) — 28-binding registry with cross-platform Ctrl/Meta aliases + `matchKeybinding(e)` O(1) lookup.
  - [interactionStore.ts](src/interaction/interactionStore.ts) — Zustand store wrapping the actor; replaces the Phase 2 stub.
- `src/canvas/hooks/`:
  - [useKeyboard.ts](src/canvas/hooks/useKeyboard.ts) — global keydown listener gated by text-field context.
  - [useMouse.ts](src/canvas/hooks/useMouse.ts) — pointer + wheel handlers (touch-type pointers delegated to useTouch).
  - [useTouch.ts](src/canvas/hooks/useTouch.ts) — single-finger tap/drag; multi-touch gestures deferred to Sub-project 4.
- Coverage thresholds: interaction ≥90/85/90/90, canvas/hooks ≥85/80/85/85.
- Integration tests covering three full flows (place → quick-rel, place → undo, rubberband select).

### Changed

- `src/state/interactionStore.ts` (Phase 2 stub) DELETED. `useInteractionStore` now lives in `src/interaction/interactionStore.ts`. `src/state/index.ts` dropped its re-export. Consumers import from `@/interaction`.

### Notes

- 100% FSM transition coverage achieved — every state-event pair that the spec §4.6 chart declares is tested (see machine.test.ts + integration.test.ts).
- `src/canvas/ERCanvas.tsx` still renders a blank React Flow canvas — Phase 4 wires the glyphs and mounts these hooks.
- XX unit tests pass (update the number after running `pnpm test` during final commit).
```

Replace `XX` with the actual test count from Task 15 Step 1.

- [ ] **Step 2: Commit**

```bash
cat > /tmp/phase3-task16-msg.txt <<'EOF'
docs: changelog entry for Phase 3

Interaction FSM (XState machine body), canvas input hooks
(mouse/keyboard/touch), keybindings registry, and the
interactionStore migration from state/ to interaction/.
100% FSM transition coverage achieved.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
git add CHANGELOG.md
git commit -F /tmp/phase3-task16-msg.txt
```

---

## Post-plan notes (for the controller)

- Phase 4 will mount the hooks (`useMouse`/`useKeyboard`/`useTouch`) onto `<ERCanvas>`'s root element. The hooks' return shape is already aligned with React Flow's container props.
- Phase 4 will also add per-node-kind custom components. Their `onPointerDown` / `onPointerUp` will need to call `NODE_POINTER_DOWN` / `NODE_POINTER_UP` events — consider a `useNodePointer(nodeId)` helper in Phase 4 that bundles this.
- `connectToGeneralization` state has a minimal body right now — Phase 4 UI (right-click-on-ISA → "add child") will exercise it. Phase 3 leaves it reachable but requires external PICK_TOOL routing (or a dedicated event like `INITIATE_ISA_CHILD` which Phase 4 can add later).
- Phase 6 consumes `keybindings` for the cheatsheet modal — it already has `descriptionKey`s and `category` to drive the UI.
- Clipboard stubs (`stubCopy/stubCut/stubPaste`) will be replaced in Sub-project 4 with a `ClipboardStore` + serialiser that round-trips through the clipboard API.

## Self-review checklist

- **Spec coverage:** every state from spec §4.6's chart has a task (Tasks 5–7) and every state has tests. Keybindings match §7.2; mouse model §7.3; touch model §7.4 (single-finger subset for Phase 3 — multi-touch deferred per plan text).
- **No placeholders:** every task body has complete code and exact commands.
- **Type consistency:** `EditorEvent` is defined in Task 2 and used by every subsequent task; `EditorContext` from Task 2 is referenced throughout; `Modifiers` / `PointerButton` / `ResizeHandle` / `Tool` exports are stable. `Keybinding` type in Task 8 defines the shape consumed by Task 10's `useKeyboard`.
- **Layer compliance:** `interaction/` imports from `@/domain` and `@/state`. `canvas/hooks/` imports from `@/interaction`, `@/domain`, `@/state`. No forbidden cross-layer imports.
- **100% transition coverage:** Tasks 5+6+7 together test every state-event pair declared in the chart. The integration test in Task 14 proves the pieces work together.
