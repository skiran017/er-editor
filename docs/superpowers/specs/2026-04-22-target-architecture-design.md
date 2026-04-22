# ER Editor v2 — Target Architecture & Feature Audit

**Status:** draft for review
**Date:** 2026-04-22
**Author:** drafted via brainstorming with skiran017
**Scope:** the "blueprint" spec for Sub-project 1 of the ER Editor v2 rewrite. Defines module boundaries, atomicity rules, state-shape redesign, per-feature keep/change/remove/add decisions, the "draw.io-smooth" target, and the phased migration sequence. Every subsequent sub-project (refactor execution, feature excellence, testing, documentation) references this document.

---

## Table of contents

1. [Goals, non-goals, and locked decisions](#1-goals-non-goals-and-locked-decisions)
2. [Architecture overview — layers, boundaries, folders](#2-architecture-overview)
3. [Data model — indexed, normalized, notation-agnostic shell + Chen-embedded core](#3-data-model)
4. [State architecture — sliced Zustand + XState FSM](#4-state-architecture)
5. [Rendering layer — React Flow + notation plugin contract](#5-rendering-layer)
6. [Validation and I/O codecs](#6-validation-and-io-codecs)
7. [Interaction model — keyboard, mouse, touch, snapping](#7-interaction-model)
8. [Atomicity rules and testing strategy](#8-atomicity-rules-and-testing-strategy)
9. [Feature audit — keep / change / remove / add](#9-feature-audit)
10. [Migration sequence — phased plan](#10-migration-sequence)
11. [Acceptance criteria](#11-acceptance-criteria)
12. [Appendices](#12-appendices)

---

## 1. Goals, non-goals, and locked decisions

### 1.1 Why this rewrite

Current pain:

- `src/store/editorStore.ts` is 1857 lines; `src/components/canvas/ERCanvas.tsx` is ~64 KB. Several shape components exceed 500 lines. Atomicity is low, testability is low, and new features are expensive to land.
- Canvas renders on Konva (imperative, canvas-2D). Matching draw.io-class interaction feel on Konva means reimplementing what a purpose-built graph-editor library gives for free (lasso, snap, handles, keyboard nav, SVG export).
- Several declared Java-ERDesigner compatibility gaps remain open (orthogonal connection routing, entity sizing, dynamic relationship sizing). These are load-bearing for the Moodle deployment at SUPSI.
- No automated test suite. 28 of 33 Chen validation rules implemented but without regression coverage.
- i18n infrastructure present; IT locale is incomplete.

### 1.2 Target quality bar — "smooth as draw.io"

Interpretation (locked):

- **Interaction feel** — 60 fps drag/pan/zoom, snap guides, smart alignment, keyboard-driven workflows, touch parity.
- **Visual polish** — crisp SVG glyphs, consistent spacing, clear selection affordances, accessible color + contrast.
- **Extensibility** — architecture extensible to other notations (Crow's Foot, UML) as plugins, without core changes.
- **Scope** is the existing ER vocabulary only: Entities (strong/weak), Relationships (strong/identifying, recursive, N-ary, quick flows 1:1 / 1:N / N:M), Attributes (key, discriminant, multivalued, derived, composite), Generalizations (total/partial). **No** template library, multi-page, comments, collaboration, or cloud persistence.

### 1.3 Locked decisions from the brainstorming pass

| Decision | Choice |
|---|---|
| Notation architecture | **Chen-embedded core with notation hooks.** Core types stay (Entity/Relationship/Attribute/ISA); visual glyphs, validation rules, cardinality display, and I/O codecs are swappable plugin modules. |
| Rendering engine | **React Flow (xyflow).** Controlled state, custom node & edge components per notation. |
| State architecture | **Sliced Zustand stores** — `diagramStore` (zundo-wrapped) + `viewportStore` + `selectionStore` + `interactionStore` + `validationStore` + `uiStore`. |
| Interaction state | **XState FSM** inside `interactionStore` for drawing, mode-switching, quick-relationship, quick-generalization, and connect flows. |
| Migration strategy | **Archive + rebuild on `v2` branch.** Move current `src/*` to `src/legacy/`, build fresh in the new `src/`, cherry-pick what we need, delete `legacy/` and replace `main` when `v2` reaches parity. |
| Data model shape | **Indexed + normalized.** `Diagram = { nodesById, edgesById, nodeOrder, edgeOrder, schemaVersion }`, with discriminated-union node and edge types. |
| Internal coordinate system | **Top-left world coordinates** (React Flow native). Conversion to/from Java XML's center-based coordinates happens inside the Java XML codec only. |
| Atomicity rules | **Soft target 200 lines / hard warning 350** per file (ESLint `warn`, not `error`, for now). One component per file. Named exports only. Layer-boundary imports enforced. |
| Testing | Vitest (unit + integration) + Playwright (E2E). Coverage targets per layer. SUPSI Java XML round-trip is the hard acceptance gate. |
| Scope of this rewrite | v1 target list in this doc; deferrals tracked in `docs/superpowers/BACKLOG.md`. |

### 1.4 Non-goals of this blueprint

- Implementing any of it — this is the design document. Execution is Sub-project 2, driven by writing-plans.
- Picking a documentation tool — Sub-project 5.
- Designing the second notation (Crow's Foot / UML) — this blueprint guarantees the seams exist; the actual second notation is post-v2.
- Server-side anything. The editor remains a pure SPA.

---

## 2. Architecture overview

### 2.1 Layers

```
┌──────────────────────────────────────────────────────────────┐
│  ui/           React components for chrome — menus, panels,  │
│                toolbars, overlays, primitives.               │
├──────────────────────────────────────────────────────────────┤
│  canvas/       React Flow integration + per-notation custom  │
│                node/edge components + input hooks.           │
├──────────────────────────────────────────────────────────────┤
│  interaction/  XState FSM: modes, drawing, quick flows,      │
│                selection sub-states, dragging, resizing.     │
├──────────────────────────────────────────────────────────────┤
│  state/        Sliced Zustand stores + orchestration layer.  │
├──────────────────────────────────────────────────────────────┤
│  notation/     Plugin modules. notation/chen/ ships first;   │
│                exposes glyphs, rules, codecs, toolbar config.│
├──────────────────────────────────────────────────────────────┤
│  platform/     Environment adapters: i18n, theme, Moodle     │
│                postMessage bridge, file I/O, image export.   │
├──────────────────────────────────────────────────────────────┤
│  domain/       Pure logic. No React, no framework. Types,    │
│                geometry, graph ops, id gen, invariants.      │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 Dependency direction

Strict top-down. Enforced via ESLint (`eslint-plugin-boundaries` or custom rule):

```
domain/         → (nothing in src/)
platform/       → domain/
state/          → domain/
interaction/    → domain/, state/
notation/       → domain/
canvas/         → domain/, state/, interaction/, notation/
ui/             → everything below
app/ (bootstrap)→ everything (only place that wires subscribers)
```

The `app/` layer is the only place that composes layers end-to-end. Subscribers that cross layer boundaries (e.g., validation reacting to diagram changes) live in `app/bootstrap.ts`, not inside the subscribed-from layer.

### 2.3 Target `src/` folder layout

```
src/
├── domain/
│   ├── types.ts
│   ├── geometry.ts
│   ├── graph.ts
│   ├── id.ts
│   └── invariants.ts
├── state/
│   ├── diagramStore.ts
│   ├── viewportStore.ts
│   ├── selectionStore.ts
│   ├── interactionStore.ts
│   ├── validationStore.ts
│   ├── uiStore.ts
│   ├── commands.ts
│   ├── selectors.ts
│   ├── wiring.ts
│   └── index.ts
├── interaction/
│   ├── machine.ts
│   ├── guards.ts
│   ├── actions.ts
│   ├── events.ts
│   └── keybindings.ts
├── canvas/
│   ├── ERCanvas.tsx
│   ├── hooks/
│   │   ├── useMouse.ts
│   │   ├── useKeyboard.ts
│   │   ├── useTouch.ts
│   │   ├── useSnapping.ts
│   │   └── useFloatingEdge.ts
│   └── adapters/
│       ├── diagramToRf.ts
│       └── rfToDiagramPatch.ts
├── notation/
│   ├── types.ts
│   └── chen/
│       ├── index.ts
│       ├── nodes/
│       │   ├── EntityNode.tsx
│       │   ├── EntityGlyph.tsx
│       │   ├── RelationshipNode.tsx
│       │   ├── RelationshipGlyph.tsx
│       │   ├── AttributeNode.tsx
│       │   ├── AttributeGlyph.tsx
│       │   ├── ISANode.tsx
│       │   └── ISAGlyph.tsx
│       ├── edges/
│       │   ├── EntityRelationshipEdge.tsx
│       │   ├── AttributeEdge.tsx
│       │   └── ISAEdge.tsx
│       ├── rules/
│       │   ├── index.ts
│       │   ├── entity.ts
│       │   ├── relationship.ts
│       │   ├── attribute.ts
│       │   └── generalization.ts
│       ├── codecs/
│       │   ├── nativeJson.ts
│       │   ├── javaXml.ts
│       │   ├── png.ts
│       │   ├── svg.ts
│       │   └── mermaid.ts
│       ├── cardinality.tsx
│       └── toolbar.ts
├── ui/
│   ├── app/
│   ├── menu/
│   ├── toolbar/
│   ├── properties/
│   ├── overlays/
│   └── primitives/
├── platform/
│   ├── i18n/
│   ├── theme/
│   ├── moodle/
│   ├── fs/
│   └── imageExport/
├── legacy/                   # v1 archive — deleted at end of rewrite
├── app/
│   └── bootstrap.ts
├── App.tsx
├── main.tsx
└── index.css
```

---

## 3. Data model

### 3.1 Top-level container

```ts
// src/domain/types.ts

export type NodeId = string & { readonly __brand: 'NodeId' }
export type EdgeId = string & { readonly __brand: 'EdgeId' }

export interface Diagram {
  readonly schemaVersion: 1
  readonly nodesById: Readonly<Record<NodeId, ERNode>>
  readonly edgesById: Readonly<Record<EdgeId, ERLink>>
  readonly nodeOrder: readonly NodeId[]
  readonly edgeOrder: readonly EdgeId[]
}
```

- O(1) lookup on all IDs.
- `nodeOrder` / `edgeOrder` supply deterministic z-ordering without a per-node `zIndex` field.
- Mutations go through Immer; all `readonly` declarations are enforced at type level.

### 3.2 Node union

```ts
export type ERNode = EntityNode | RelationshipNode | AttributeNode | ISANode

interface NodeBase {
  readonly id: NodeId
  readonly position: Point    // top-left in world coords
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
  readonly isIdentifying: boolean     // renamed from legacy isWeak
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
```

### 3.3 Edge union

```ts
export type ERLink =
  | EntityRelationshipEdge
  | AttributeEdge
  | ISAEdge

interface EdgeBase {
  readonly id: EdgeId
  readonly sourceId: NodeId
  readonly targetId: NodeId
  readonly waypoints: readonly Point[]
}

export interface EntityRelationshipEdge extends EdgeBase {
  readonly kind: 'entity-relationship'
  readonly cardinality: '1' | 'N' | 'M'
  readonly participation: 'total' | 'partial'
  readonly role?: string
}

export interface AttributeEdge extends EdgeBase {
  readonly kind: 'attribute-of'
}

export interface ISAEdge extends EdgeBase {
  readonly kind: 'isa-link'
  readonly role: 'parent' | 'child'
}
```

Free-form lines and arrows (`AnnotationEdge`) are **removed** in v2.

### 3.4 Chen concepts ↔ model mapping

| Concept | Representation |
|---|---|
| Strong entity with 2 attributes | 1 `EntityNode` + 2 `AttributeNode` + 2 `AttributeEdge` |
| Weak entity + identifier | `EntityNode{isWeak:true}` + discriminant `AttributeNode` + `RelationshipNode{isIdentifying:true}` + `EntityRelationshipEdge`s |
| N-ary relationship (3+ entities) | 1 `RelationshipNode` + N `EntityRelationshipEdge`s |
| Recursive relationship | 1 `EntityNode` + 1 `RelationshipNode` + 2 `EntityRelationshipEdge`s with different `role` values |
| Composite attribute with children | parent `AttributeNode{isComposite:true}` + child `AttributeNode`s + `AttributeEdge` children → parent |
| Relationship attribute | `AttributeNode` + `AttributeEdge` with target = `RelationshipNode` |
| Generalization (ISA) | 1 `ISANode` + 1 `ISAEdge{role:'parent'}` + N `ISAEdge{role:'child'}` |

### 3.5 Coordinate system

**Internal:** top-left, world coordinates — React Flow native. Zoom / pan live only in `viewportStore`.

**Java XML boundary conversion:**

```ts
const topLeftFromCenter = (cx, cy, w, h) => ({ x: cx - w / 2, y: cy - h / 2 })
const centerFromTopLeft = (x, y, w, h)  => ({ cx: x + w / 2,  cy: y + h / 2  })
```

No other layer knows about center-based coordinates.

### 3.6 IDs

- All new IDs: **short nanoid (10 chars)**.
- Java XML numeric IDs are mapped via `Map<JavaNumericId, NodeId>` inside the codec only; not persisted in the domain model. On export, codec assigns fresh numerics deterministically from a stable sort.

### 3.7 Invariants (checked in dev/test, gated in production)

1. Every edge references existing nodes.
2. Every `AttributeNode` has exactly one outbound `AttributeEdge` (its parent).
3. `AttributeEdge` targets an Entity, Relationship, or composite Attribute.
4. `AttributeNode.isDiscriminant === true` ⇒ parent is a weak `EntityNode`.
5. `RelationshipNode` participates in ≥2 `EntityRelationshipEdge`s (except while being actively drawn).
6. `ISANode` has exactly one parent `ISAEdge` and ≥1 child `ISAEdge`.
7. No ID collisions between nodes and edges.
8. `nodeOrder` is a permutation of `Object.keys(nodesById)` (same for edges).
9. Recursive `EntityRelationshipEdge`s (where two edges share a single entity on both ends of the same relationship) require **distinct, non-empty `role` strings** on both edges.

Validation rules (softer, notation-specific design advice) live separately in `notation/chen/rules/` and produce warnings, not hard errors. Details in §6.

### 3.8 What this kills from legacy

- `EntityAttribute` (simplified duplicate of Attribute) — **removed.**
- `Diagram.{entities, relationships, attributes, connections, generalizations, lines, arrows}` (7 typed arrays) — replaced by `nodesById` / `edgesById`.
- `Relationship.entityIds` + `.cardinalities` + `.participations` (parallel maps) — replaced by per-edge cardinality/participation on `EntityRelationshipEdge`.
- `Connection.fromPoint` / `.toPoint` / `.points` / `.labelPosition` — removed; React Flow floating edges compute attachment dynamically.
- `rotation` on entity/relationship — removed.
- `LineShape` / `ArrowShape` — removed; free-form annotations dropped from v2.

### 3.9 Deliberate absences (tracked in BACKLOG.md)

- Per-node style overrides.
- Layout hints (locked positions, auto-layout groups).
- Comments / annotations on elements.
- Timestamps / metadata bags on nodes.

---

## 4. State architecture

### 4.1 Six stores

| Store | Owns | Persisted | Undoable |
|---|---|---|---|
| `diagramStore` | `Diagram` | no (via codecs) | yes (`zundo`, limit 100) |
| `viewportStore` | zoom, pan | no | no |
| `selectionStore` | selected node/edge IDs, rubber-band state | no | no |
| `interactionStore` | XState snapshot | no | no |
| `validationStore` | errors by ID, enabled flag | `enabled` only | no |
| `uiStore` | theme, language, panels, modals, toasts | theme, language, panel state | no |

### 4.2 Diagram store actions

```ts
// Node operations
addNode(input: NodeInput): NodeId
updateNode(id: NodeId, patch: Partial<ERNode>): void
moveNode(id: NodeId, to: Point): void
resizeNode(id: NodeId, to: Size): void
removeNode(id: NodeId): void     // cascades to incident edges

// Edge operations
addEdge(input: EdgeInput): EdgeId
updateEdge(id: EdgeId, patch: Partial<ERLink>): void
setWaypoints(id: EdgeId, waypoints: Point[]): void
removeEdge(id: EdgeId): void

// Bulk / transactional
applyPatch(patch: DiagramPatch): void    // single undo step for multi-mutation ops
replaceDiagram(next: Diagram): void      // file load; clears undo stack

// Z-order
bringToFront(id: NodeId | EdgeId): void
sendToBack(id: NodeId | EdgeId): void
```

`applyPatch` is the mechanism for paste, delete-selection, import — any operation touching multiple elements produces one undo step.

### 4.3 Cross-store communication rules

1. Components subscribe to stores via hooks; components can subscribe to multiple stores.
2. Stores never directly import each other. Orchestration lives in `state/commands.ts`, which reads from multiple stores via `getState()`.
3. Reactive dependencies express in the dependent module's subscriber (e.g., validation subscribes to diagram; diagram knows nothing about validation). Subscribers register from `app/bootstrap.ts`.
4. XState machine actions use the same `getState()` pattern.

### 4.4 Validation subscriber (example)

```ts
// src/app/bootstrap.ts
import { chenRules } from '../notation/chen/rules'
import { useDiagramStore } from '../state/diagramStore'
import { useValidationStore } from '../state/validationStore'
import debounce from './debounce'

const runValidation = debounce((diagram) => {
  if (!useValidationStore.getState().enabled) return
  useValidationStore.getState().setErrors(runAll(chenRules, diagram))
}, 150)

useDiagramStore.subscribe((s) => s.diagram, runValidation)
```

150 ms debounce keeps validation off the drag / typing critical path. Full-diagram validation each run; incremental is a deferred optimisation.

### 4.5 Persistence scope

Only `uiStore` (theme, language, panel state) and `validationStore.enabled` persist to `localStorage`. Diagram never auto-persists — it moves via codecs (Moodle `postMessage`, file I/O). Standalone-session recovery is out of scope for v1.

### 4.6 Interaction FSM (XState)

Replaces the legacy ad-hoc flags: `mode`, `drawingLine.isDrawing`, `drawingConnection.isDrawing`, `pendingQuickRelationship`, `pendingQuickGeneralization`, `pendingGeneralizationConnect`.

```
editorMachine
├── idle
├── selecting
│   ├── rubberBand
│   ├── maybeDragging
│   ├── dragging
│   └── resizing
├── panning
├── placing
│   ├── entity
│   ├── relationship
│   ├── attribute
│   └── isa
├── drawing
│   └── connection.fromPicked
├── quickRelationship.firstPicked
├── quickGeneralization.firstPicked
└── connectToGeneralization.waitingForChild
```

- **Guards**: pure predicates (`isEntity(nodeId)`, `canHaveAttribute(nodeId)`, `notSameEntity(firstId, secondId)`).
- **Actions**: side-effectful (call `getState()` on stores to mutate).
- **Events**: typed (`{ type: 'PICK_TOOL', tool }`, `{ type: 'NODE_POINTER_DOWN', nodeId, point }`, etc.).

Store wrapping the machine:

```ts
export const useInteractionStore = create<InteractionState>()((set) => {
  const actor = interpret(editorMachine).onTransition((s) => set({ snapshot: s }))
  actor.start()
  return {
    snapshot: actor.getSnapshot(),
    send: (event: EditorEvent) => actor.send(event),
  }
})
```

### 4.7 Selector conventions

- Always subscribe with a selector, never to the full store.
- Shared selectors live in `state/selectors.ts` (`selectNodeById`, `selectIncidentEdges`, `selectSelectedNodes`).
- Wrap non-trivial read patterns in custom hooks (`useEntity(id)` not raw `useDiagramStore` reads in leaf components).

---

## 5. Rendering layer

### 5.1 Controlled React Flow

The React Flow component is **controlled**. `diagramStore` is the sole source of truth; React Flow is a view.

```
diagramStore (Diagram)
      │
  diagramToRf()  (pure, memoised)
      │
  nodes[] + edges[]
      │
  <ReactFlow>
      │
  user interaction
      │
  handlers translate events → typed store actions → Immer produces new Diagram → selector recomputes
```

### 5.2 Adapter

```ts
// src/canvas/adapters/diagramToRf.ts
export const diagramToRf = (diagram: Diagram): { nodes: RfNode[]; edges: RfEdge[] } => ({
  nodes: diagram.nodeOrder.map((id) => domainNodeToRf(diagram.nodesById[id])),
  edges: diagram.edgeOrder.map((id) => domainEdgeToRf(diagram.edgesById[id])),
})

const domainNodeToRf = (n: ERNode): RfNode => ({
  id: n.id,
  type: n.kind,
  position: n.position,
  data: { nodeId: n.id },
  width: n.size.width,
  height: n.size.height,
})
```

Pure. Unit-tested. Memoised via `useMemo(() => diagramToRf(diagram), [diagram])` — `diagram` identity changes only on mutation (Immer).

### 5.3 Custom node components (Chen glyphs)

Each glyph = container (store subscription) + glyph (pure SVG). Separate files.

```tsx
// src/notation/chen/nodes/EntityNode.tsx
export const EntityNode = memo(({ data }: NodeProps<{ nodeId: NodeId }>) => {
  const node     = useDiagramStore(selectNodeById<EntityNode>(data.nodeId))
  const selected = useSelectionStore((s) => s.selectedNodeIds.has(data.nodeId))
  const warnings = useValidationStore((s) => s.errorsById[data.nodeId])
  return <EntityGlyph node={node} isSelected={selected} warnings={warnings} />
})
```

Glyph component (`EntityGlyph.tsx`) is pure props — testable standalone, Storybook-friendly.

### 5.4 Custom edge components

Cardinality labels, participation markers (single/double line), recursive role labels, waypoint handles — all render inside the edge component.

Default edge routing: React Flow's `smoothstep` (rounded orthogonal) — this closes the Java-compat "orthogonal routing" gap for free.

### 5.5 Floating edges

All ER edges use floating attachment — edge endpoints compute to the nearest point on the source/target boundary as nodes move. Implementation: `canvas/hooks/useFloatingEdge.ts`, adapted from React Flow's official floating-edges example. Fixed `<Handle>` components hidden.

### 5.6 Notation plugin contract

```ts
// src/notation/types.ts
export interface NotationPlugin {
  readonly id: string
  readonly label: string

  readonly nodeTypes:  Record<NodeKind, React.ComponentType<NodeProps<{ nodeId: NodeId }>>>
  readonly edgeTypes:  Record<EdgeKind, React.ComponentType<EdgeProps<{ edgeId: EdgeId }>>>

  readonly tools: ToolbarConfig
  readonly defaults: {
    entitySize: Size
    relationshipSize: Size
    attributeSize: Size
    isaSize: Size
    edgeType: 'smoothstep' | 'step' | 'straight'
  }

  readonly validate: (diagram: Diagram) => Record<string, ValidationError[]>

  readonly codecs: {
    nativeJson: Codec
    javaXml?:   Codec
    png?:       Codec
    svg?:       Codec
    mermaid?:   Codec
  }
}
```

`ERCanvas.tsx` is parameterised on a `NotationPlugin`. Adding Crow's Foot later = registering a second plugin.

### 5.7 Default sizes

- Entity: **120 × 60**
- Relationship: **140 × 70**
- Attribute: **90 × 50**
- ISA: triangle with 100 base × 60 height
- Java-imported diagrams preserve whatever size is in the XML.

### 5.8 Performance posture

- Per-node selectors: each glyph reads only its own node's slice; sibling moves don't re-render.
- Adapter memoisation: one recompute per diagram mutation.
- Edge recompute: React Flow handles — only edges incident to moved nodes redraw.
- **Target**: 60 fps drag on diagrams up to 100 nodes / 200 edges. Virtualisation via React Flow's `onlyRenderVisibleElements` is a later lever.

### 5.9 Accessibility

- Roving tabindex across `nodeOrder`.
- ARIA labels from `name` + `kind`.
- Screen-reader live region for selection, mode, validation events.
- `prefers-reduced-motion` respected (no animated pan/zoom transitions).
- Full a11y pass is Sub-project 4; the architecture must not block it.

---

## 6. Validation and I/O codecs

### 6.1 Validation rule shape

```ts
export interface ValidationError {
  readonly ruleId: string
  readonly severity: 'error' | 'warning'
  readonly targetId: NodeId | EdgeId
  readonly messageKey: string       // i18n key
  readonly messageParams?: Record<string, string>
}

export interface ValidationRule {
  readonly id: string
  readonly severity: 'error' | 'warning'
  readonly category: 'entity' | 'relationship' | 'attribute' | 'generalization' | 'structural'
  readonly check: (diagram: Diagram) => readonly ValidationError[]
}
```

- Messages are i18n keys; UI resolves via i18next at render time. Rules stay locale-free.
- `targetId` is singular; cross-element rules emit one error per participant.
- Every rule is a pure function.

### 6.2 Rule organisation

```
notation/chen/rules/
├── index.ts
├── entity.ts           // ~8 rules
├── relationship.ts     // ~7 rules
├── attribute.ts        // ~8 rules
└── generalization.ts   // ~5 rules
```

Target: **33/33 rules from VALIDATION.md** (the 28 already implemented in [legacy/validation.ts](src/lib/validation.ts) plus the 5 missing ones).

### 6.3 Validation runs when and how

- Subscriber in `app/bootstrap.ts`.
- Debounced at 150 ms.
- Gated by `validationStore.enabled` (persisted).
- Full-diagram run per change. Incremental validation is a deferred optimisation.

### 6.4 Error surfacing

- **Node/edge components**: warning badge when errors exist for the ID; tooltip lists resolved messages.
- **Property panel**: shows violations relevant to the currently selected element.
- **Validation list panel** (list view with jump-to-element): **not in v1.** Deferred to Sub-project 4.

### 6.5 Codec contract

```ts
export type ParseResult =
  | { ok: true;  diagram: Diagram;  warnings: readonly ParseWarning[] }
  | { ok: false; errors: readonly ParseError[] }

export interface Codec {
  readonly id: string
  readonly label: string
  readonly mimeType: string
  readonly fileExtension: string
  readonly role: 'import-export' | 'import-only' | 'export-only'
  readonly parse?:     (input: string)    => ParseResult
  readonly serialize?: (diagram: Diagram) => string
}
```

`Result`-typed parse — no thrown exceptions. UI surfaces errors via a modal.

### 6.6 Codecs shipping in v1

| Codec | Role | Notes |
|---|---|---|
| `chen-native-json` | import-export | New. Replaces legacy custom XML. Schema-versioned. **Format finalised after SUPSI XML sample arrives** — align structure/element names to minimise Java codec transform cost. |
| `chen-java-xml` | import-export | Ported from legacy. ERDesigner.jar compatibility. Coordinate conversion isolated to this codec. |
| `chen-png` | export-only | Via React Flow `toImage` + `html-to-image`. |
| `chen-svg` | export-only | DOM-to-SVG serialiser; free because we render SVG. |
| `chen-mermaid` | export-only | ~100 lines. Diagram → Mermaid text. |

Legacy custom "standard XML" is **not** ported. If SUPSI has saved files in that format, a one-shot migration codec can be added later — not in v1.

### 6.7 Schema versioning

- `Diagram.schemaVersion: 1` on every native JSON save.
- Codec's `parse` reads version first; routes through migrators if needed.
- Future: `v1→v2` ships with v2, `v1→v2→v3` with v3 — additive.
- Users see "this file was from an older version; saving will update it" toast when a migrator runs.

### 6.8 SUPSI Java XML acceptance criterion

- User will supply a real SUPSI-produced sample; it lands in `tests/fixtures/supsi/`.
- **Hard acceptance gate**: load → edit unrelated elements → save → diff is byte-clean for every element we didn't touch. No whitespace drift, no attribute reordering, no default-value injection.
- Round-trip test runs in CI.

---

## 7. Interaction model

### 7.1 Three-input parity

Mouse, keyboard, and touch layers all dispatch the **same FSM events**. Behaviour is identical regardless of input.

### 7.2 Keyboard model

Single source of truth: `interaction/keybindings.ts`. Cheatsheet modal (`?`) reads from the same registry.

**Tool shortcuts** (no modifier): `V` select, `H` / `Space` pan, `E` entity, `R` relationship, `A` attribute, `G` generalization, `C` connect.

**Operation shortcuts** (Cmd/Ctrl): `Z` / `Shift+Z` undo/redo, `C` / `V` / `X` copy/paste/cut, `D` duplicate, `A` select-all, `0` fit, `+` / `-` zoom, `S` save, `O` open.

**Contextual** (no modifier, work on selection): `Delete` / `Backspace` remove, `Escape` clear/cancel, `Enter` / `F2` rename, arrow keys nudge (1 px, 10 px with Shift), `Tab` / `Shift+Tab` cycle selection, `?` cheatsheet.

Legacy toast-shortcut popup is replaced by the modal cheatsheet.

### 7.3 Mouse model

| Action | Behaviour |
|---|---|
| Left-click empty canvas | Rubber-band selection (select tool); place element (placement tool) |
| Left-click node | Select; Shift+click = toggle in set; drag = move |
| Middle-drag / right-drag | Pan |
| Wheel | Zoom at cursor; Shift+wheel = horizontal pan; Ctrl+wheel = vertical pan |
| Double-click node | Inline rename |
| Double-click edge midpoint | Insert waypoint |
| Right-click node/edge | Context menu |
| Drag from node boundary | Start connection draw |

Right-click context menus are new — standard smooth-editor expectation.

### 7.4 Touch model

| Gesture | Behaviour |
|---|---|
| Single tap | Select |
| Single drag on node | Move node |
| Single drag on empty canvas | Pan (rubber-band via long-press-then-drag) |
| Two-finger pinch | Zoom |
| Two-finger drag | Pan |
| Long-press | Context menu |
| Double-tap node | Inline rename |

Pointer events with `pointerType` detection — no separate touch event path.

### 7.5 Snapping and guides

- **Grid snap** (toggle, default off): 10 px step.
- **Smart alignment guides** (default on): compute distances to neighbour edges/centers during drag; snap threshold 4 px; render subtle guide lines for active alignments.
- **Equal-spacing guides**: stretch target for v1.

Pure function `domain/snap.ts` takes the dragged node + rest of diagram, returns `{ snappedPosition, activeGuides[] }`. Canvas renders the guides as an overlay.

### 7.6 Selection model

- Single click = select only.
- Shift+click = toggle in set.
- Rubber band = replace; Shift+rubber band = union.
- Marquee hit = **intersection** (touches box = selected), matching draw.io.
- Group move: all selected move by the same delta.
- Group resize (proportional): v1 feature.
- Cycle selection with Tab / Shift+Tab walks `nodeOrder`.
- Invert selection: Shift+Alt+A.

### 7.7 Drag-from-toolbar

New v2 behaviour. Toolbar icons draggable onto the canvas. Coexists with click-tool mode. Both paths go through the same FSM events.

### 7.8 Edge routing

- Default: `smoothstep` (rounded orthogonal).
- Manual waypoints: double-click midpoint to insert; drag to reposition; right-click → remove.
- Re-route button on edge context menu resets to auto.
- Obstacle avoidance: not in v1.

### 7.9 Cursor feedback

Every FSM state has a canonical cursor; cursor driven by FSM state, not by ad-hoc component logic.

### 7.10 Toasts, modals, responsive layout

- `uiStore.toasts`: success/warning/error toasts.
- Error modal for unrecoverable events (malformed import, failed save).
- Cheatsheet modal (`?`).
- Confirm only for truly destructive, non-undoable actions (e.g., "clear diagram").
- Desktop = three panes (toolbar left, canvas center, properties right).
- Tablet landscape = tighter padding, collapsible properties.
- Tablet portrait = properties as bottom sheet.
- Mobile-phone support = Sub-project 4 stretch.

### 7.11 Performance targets

- Drag a selected node: 60 fps up to 100 nodes / 200 edges.
- Zoom: 60 fps (React Flow native transform).
- Paste of 20 nodes: <50 ms.
- Validation after change: 150 ms debounce + <50 ms compute for 100-node diagrams.
- Java XML load of 100-node diagram: <500 ms.

Numbers are targets; verified in Sub-project 3 with a stress fixture.

---

## 8. Atomicity rules and testing strategy

### 8.1 File-size budgets

- **200 lines** — soft target.
- **350 lines** — warn-level ESLint threshold. Not an error; overridable per-file with inline disable. Will tighten if files creep.
- Functions: <50 lines typical; >100 lines requires an inline comment explaining why (rare).

### 8.2 File organisation

- One React component per file. Filename matches component (`EntityNode.tsx` exports `EntityNode`).
- One hook per file.
- Private sub-components allowed inline only if trivially small (<30 lines) and used only by the parent.
- **Named exports only** — no `export default` (enforced by ESLint).
- Tests co-located with source (`Foo.tsx` + `Foo.test.tsx`). Fixtures in `tests/fixtures/`.

### 8.3 Naming conventions

- Components: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Pure modules: `camelCase.ts`
- Types: `PascalCase`, no `I` prefix
- Store files: `<domain>Store.ts`
- ID types: opaque branded types, never bare `string`

### 8.4 Dependency direction enforcement

ESLint (`eslint-plugin-boundaries` or custom rule) enforces the layer direction in §2.2. `legacy/` is a no-import zone for everything outside `legacy/`.

### 8.5 Component composition rules

- Presentational glyph + container split: glyphs in `notation/chen/nodes/` are pure props; containers subscribe to stores.
- Leaf components receive data via props; only containers subscribe to stores.
- Custom hooks wrap every non-trivial store read pattern.

### 8.6 ESLint rules summary

1. `max-lines: ['warn', 350]`
2. `max-lines-per-function: ['warn', 100]`
3. Layer-boundary rule (custom or plugin)
4. `no-default-export` (except `main.tsx`, `App.tsx`)
5. `no-restricted-imports` blocking `legacy/` imports from outside `legacy/`
6. `complexity: ['warn', 15]`
7. `eslint-plugin-react-hooks` strict
8. `eslint-plugin-import/order` for import ordering

### 8.7 Test pyramid

| Tier | Tool | Count | Scope |
|---|---|---|---|
| Unit | Vitest | ~500+ | `domain/`, rules, codecs, store reducers, selectors, adapters, FSM transitions |
| Integration | Vitest + RTL + user-event | ~100 | store ↔ component wiring, FSM ↔ stores |
| E2E | Playwright | ~20 | critical user flows end-to-end |

### 8.8 Coverage targets

| Layer | Target |
|---|---|
| `domain/` | ≥95% |
| `notation/chen/rules/` | ≥90% (every rule: ≥1 positive + ≥1 negative test) |
| `notation/chen/codecs/` | ≥90% (round-trip tests the core) |
| `state/` | ≥85% |
| `interaction/machine.ts` | 100% transition coverage |
| `canvas/adapters/` | 100% |

### 8.9 Critical E2E flows

1. Create 2 entities, quick-relationship connect, save JSON, reopen, identical state.
2. Import SUPSI Java XML fixture; N entities at expected positions.
3. **Round-trip SUPSI fixture: import → no-op edit → export → byte-clean diff.**
4. Copy-paste 3 nodes + incident edges; paste preserves relative positions and internal edges.
5. Lasso-select 5 nodes, group move, all move together.
6. Undo 20 edits, redo all, final state matches.
7. Validation on → missing discriminant → warning appears → fix → warning clears.
8. Moodle bridge mock: receive `load` → show diagram → edit → autosave fires on debounce with valid XML.

### 8.10 Fixtures

```
tests/fixtures/
├── supsi/
│   └── <to-be-provided>.xml
├── diagrams/
│   ├── empty.json
│   ├── simple-entity-attr.json
│   ├── weak-entity-with-identifier.json
│   ├── nary-relationship.json
│   ├── recursive-relationship.json
│   ├── isa-hierarchy.json
│   └── stress-100-nodes.json
└── rules/
    └── (one file per rule id)
```

### 8.11 CI

- Every push / PR: lint + typecheck + unit + integration (fail fast, <90 s target).
- PR to `main` + nightly: Playwright E2E (~5-10 min).
- Bundle-size check: warn on >10% PR-over-PR growth.
- Visual regression: Sub-project 4 add-on.

### 8.12 Test-writing conventions

- Arrange / act / assert with blank-line separators.
- Named fixture factories (`makeEntity({name:'Student'})`) over inline literals.
- Snapshots only for stable user-visible outputs (codec serialisations).
- One concept per test; test name describes behaviour.

---

## 9. Feature audit

Legend: ✅ keep · ✏️ change · ❌ remove · ➕ add.

### 9.1 Element types

| Feature | Verdict | Notes |
|---|---|---|
| Strong entity | ✅ | Rectangle glyph. |
| Weak entity | ✅ | Double-border variant. |
| Strong relationship | ✅ | Diamond glyph. |
| Identifying relationship | ✏️ | Rename `isWeak` → `isIdentifying` on domain type. Double-diamond glyph. |
| Recursive relationship | ✅ | Role labels on each edge distinguish sides. |
| N-ary relationship (3+) | ✅ | One relationship node + N edges — no special case. |
| Attribute (base) | ✅ | Ellipse glyph. |
| Key attribute | ✅ | Underlined name. |
| Discriminant | ✅ | Dashed underline; invariant: only on weak-entity attributes. |
| Multivalued | ✅ | Double ellipse. |
| Derived | ✅ | Dashed ellipse. |
| Composite attribute + sub-attributes | ✏️ | Types exist; canvas/UI completion in v2. |
| Generalization (ISA) + total/partial | ✅ | Triangle node + parent/child edges. |
| Free-form line / arrow | ❌ | Removed. |

### 9.2 Element properties

| Feature | Verdict | Notes |
|---|---|---|
| `position` | ✏️ | Center-based → top-left world coords internally. |
| `size` | ✏️ | New defaults: entity 120×60, relationship 140×70, attribute 90×50. |
| `rotation` | ❌ | Removed — unused, not standard Chen. |
| `hasWarning` / `warnings[]` on nodes | ✏️ | Moved to `validationStore.errorsById`. |
| `EntityAttribute` (simplified duplicate) | ❌ | Deleted; attributes live once. |
| `Relationship.entityIds` + cardinalities + participations | ❌ | Replaced by per-edge fields on `EntityRelationshipEdge`. |
| `Connection.fromPoint`/`toPoint`/`points`/`labelPosition` | ❌ | Replaced by floating edges + computed paths/labels. |
| `Connection.waypoints` | ✅ | Moved to `ERLink.waypoints`. |
| `Connection.role` | ✅ | Moved to `EntityRelationshipEdge.role`. |

### 9.3 Creation flows

| Feature | Verdict | Notes |
|---|---|---|
| Click-tool-then-click-canvas | ✅ | For every element kind. |
| Quick-relationship (1:1 / 1:N / N:M) | ✅ | FSM-driven. |
| Quick-generalization (total / partial) | ✅ | FSM-driven; repeat-child mode. |
| Connect-to-generalization | ✅ | Add child to existing ISA. |
| Free-form connection draw | ✅ | |
| Drag-from-toolbar | ➕ | Coexists with click-tool. |
| Inline-attribute-on-entity-click | ✅ | |
| Auto-position children of composite attributes | ➕ | Currently manual. |

### 9.4 Selection & manipulation

| Feature | Verdict | Notes |
|---|---|---|
| Single-click select | ✅ | |
| Shift+click toggle | ✅ | |
| Drag to move | ✅ | Group move if multiple selected. |
| Resize via handles | ✅ | |
| Rubber-band (lasso) | ✏️ | Current impl is partial — complete. |
| Group move | ✏️ | Deterministic; same delta for all selected. |
| Group proportional resize | ➕ | v1 feature. |
| Cycle selection with Tab / Shift+Tab | ➕ | |
| Invert selection (Shift+Alt+A) | ➕ | |
| Right-click context menu | ➕ | |

### 9.5 Editing

| Feature | Verdict | Notes |
|---|---|---|
| Inline rename on double-click | ✏️ | Extend beyond names to cardinality / role labels. |
| Property panel | ✏️ | Rewrite against new data model. One file per element kind. |
| Inline attribute management on entity | ✅ | |
| Relationship entity list (now edge-per-row) | ✏️ | Reflect edge-per-participation model. |
| Composite attribute sub-tree in panel | ➕ | |
| ISA parent/children/total-partial | ✅ | |
| Delete button in panel | ✅ | |

### 9.6 History

| Feature | Verdict | Notes |
|---|---|---|
| Undo | ✅ | Scoped to `diagramStore` only — fixes current "undo wipes viewport/selection" bug. |
| Redo | ✅ | |
| Undo depth | ✏️ | Bounded to 100. |
| Transactional multi-mutation | ➕ | `applyPatch` for paste/delete-selection/import as one step. |

### 9.7 Clipboard

| Feature | Verdict | Notes |
|---|---|---|
| Copy / Cut / Paste / Duplicate | ➕ | Cmd/Ctrl + C/X/V/D. Paste offset 16 px if same diagram. Edges referencing out-of-selection nodes dropped, toast on drop. |
| Cross-document paste | ➖ | Stretch; Sub-project 4. |

### 9.8 Viewport

| Feature | Verdict | Notes |
|---|---|---|
| Wheel zoom at cursor | ✅ | |
| `+` / `-` / `0` | ✅ | |
| Pan (Space-drag / middle / right) | ✅ | |
| Fit-to-view on load | ✅ | |
| Grid background (toggle) | ➕ | Off by default. |
| Grid snap (toggle) | ➕ | 10 px. Independent of grid-visibility. |
| Smart alignment guides | ➕ | On by default. |
| Minimap | ➕ | v1 (React Flow built-in). |

### 9.9 Validation

| Feature | Verdict | Notes |
|---|---|---|
| 28 current Chen rules | ✅ | Ported to `notation/chen/rules/`. |
| 5 remaining rules | ➕ | Close out 33/33. |
| Warning badge on node/edge | ✅ | From `validationStore.errorsById`. |
| Tooltip with messages | ✅ | i18n-resolved. |
| Toggle enabled | ✅ | Persisted. Fixes reset-on-reload bug. |
| Exam-mode interaction | ✅ | `?examMode=true` disables validation unless `?validation=on`. |
| Validation list panel | ➖ | Not v1. Sub-project 4. |

### 9.10 I/O

| Feature | Verdict | Notes |
|---|---|---|
| Custom "standard XML" (our format) | ❌ | Dropped. |
| Java XML (ERDesigner.jar) | ✅ | Ported. Round-trip clean against SUPSI fixture = hard gate. |
| Native JSON | ➕ | Schema-versioned. Shape finalised once SUPSI XML sample arrives. |
| PNG export | ✅ | |
| JPEG export | ❌ | Redundant with PNG. |
| SVG export | ➕ | Native. |
| Mermaid export | ➕ | v1, export-only. |
| Import malformed-file handling | ✏️ | Result-typed parse; errors in a modal, not thrown exceptions. |
| Old-custom-XML migration codec | ➖ | Skip unless SUPSI users have saved files in the old format. |

### 9.11 Moodle integration

| Feature | Verdict | Notes |
|---|---|---|
| `?embed=true` / `?examMode=true` / `?validation=on|off` / `?lang=…` / `?readonly=…` | ✅ | |
| postMessage bridge | ✏️ | Moves to `platform/moodle/bridge.ts`. Strict origin validation (no wildcard fallback). Typed event schema. |
| Autosave debounce (800 ms) | ✅ | |
| `save` on page hide/unload | ✅ | |
| Moodle host script | ✅ | Verify end-to-end against real Moodle. |

### 9.12 Internationalisation

| Feature | Verdict | Notes |
|---|---|---|
| i18next + react-i18next | ✅ | |
| English bundle | ✅ | |
| Italian bundle | ✏️ | Complete every key; audit `t('…')` sites. |
| `?lang=en|it` | ✅ | |
| Browser language detection | ✅ | |
| Missing-key linter in CI | ➕ | Script diffs `t(…)` calls against locale JSONs. |

### 9.13 Theming

| Feature | Verdict | Notes |
|---|---|---|
| Light / dark / system | ✅ | |
| Theme persisted | ✅ | |
| Per-element color overrides | ➖ | Not v1. |

### 9.14 Keyboard, toolbar, menu, help

| Feature | Verdict | Notes |
|---|---|---|
| Shortcuts | ✏️ | Registry-driven (`interaction/keybindings.ts`). |
| Shortcut toast | ❌ | Replaced by cheatsheet modal. |
| Cheatsheet modal (`?`) | ➕ | Generated from registry. |
| Menu (Open/Save/Export/…) | ✏️ | Codec-name-driven. |
| Toolbar | ✏️ | Tool list from `NotationPlugin.tools`. |
| Help | ✅ | Links to cheatsheet. |
| First-run tutorial | ➖ | User docs carry onboarding. |

### 9.15 Exam mode

| Feature | Verdict | Notes |
|---|---|---|
| Read-only enforcement | ✅ | |
| Indicator badge | ✅ | |
| Save/export disabled | ✅ | |
| Audit trail | ➖ | Not requested. |

### 9.16 New introductions (no "keep" row)

Grid + snap + smart alignment guides, minimap, right-click context menu, drag-from-toolbar, cheatsheet modal, native JSON format, SVG export, Mermaid export, copy/cut/paste/duplicate, layer-boundary ESLint rules, file-size warnings, test suite (Vitest + Playwright), SUPSI fixture regression, locale-key linter.

---

## 10. Migration sequence

### 10.1 Ground rules

- Bottom-up phasing: `domain/` → `state/` → `interaction/` → `canvas/` → `notation/` → `codecs` → `ui/` → `platform/`.
- Every phase lands tested and green in CI.
- `legacy/` is read-only reference; no imports into new `src/`.
- `main` untouched until Phase 8 acceptance; all work on `v2`.
- Phase 5 blocks on SUPSI XML sample arrival.

### 10.2 Phase 0 — Archive & scaffold (≈1 day)

- `git mv src/* src/legacy/` preserving history.
- Create new skeleton folders per §2.3.
- Add deps: `@xyflow/react`, `xstate`, `@xstate/react`, `vitest`, `@testing-library/react`, `@testing-library/user-event`, `@playwright/test`, `nanoid`.
- Remove deps: `konva`, `react-konva`.
- Configure ESLint boundaries + line-limit warnings + no-default-export.
- CI pipeline: lint + typecheck + unit + integration every push; Playwright on PR-to-main + nightly.
- App boots to blank React Flow canvas.

**Exit:** clean `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`; dev server shows blank canvas; `legacy/` isolated.

### 10.3 Phase 1 — Domain layer (≈2–3 days)

- `domain/types.ts`, `domain/id.ts`, `domain/geometry.ts`, `domain/graph.ts`, `domain/invariants.ts`.
- Port 28 rules from `legacy/validation.ts` into `notation/chen/rules/`, add 5 missing from `VALIDATION.md` for 33/33.
- Unit tests for every rule (positive + negative) and every geometry/graph/invariant function.

**Exit:** ≥95% coverage in `domain/`, ≥90% in `notation/chen/rules/`, every invariant + rule tested.

### 10.4 Phase 2 — State layer (≈2–3 days)

- Six sliced stores.
- `zundo` around `diagramStore`, limit 100, `partialize: { diagram }`.
- `state/commands.ts` orchestration.
- `state/selectors.ts` memoised reads.
- `persist` middleware on `uiStore` and `validationStore.enabled`.
- Dev-mode invariant check on every diagram mutation.

**Exit:** every store action has a pre/post-state test; undo/redo integration test proves scope correctness.

### 10.5 Phase 3 — Interaction FSM (≈2–3 days)

- `interaction/machine.ts` with full chart from §4.6.
- `canvas/hooks/useMouse.ts`, `useKeyboard.ts`, `useTouch.ts` dispatching typed events.
- `interaction/keybindings.ts` registry.

**Exit:** 100% FSM transition coverage; input-layer tests verify correct events dispatched.

### 10.6 Phase 4 — Rendering layer (Chen glyphs) (≈4–5 days)

- Custom nodes: `EntityNode`/`EntityGlyph`, `RelationshipNode`/`RelationshipGlyph`, `AttributeNode`/`AttributeGlyph`, `ISANode`/`ISAGlyph`.
- Custom edges: `EntityRelationshipEdge`, `AttributeEdge`, `ISAEdge`.
- Floating-edge helper.
- Adapters (`diagramToRf`, `rfToDiagramPatch`).
- `canvas/ERCanvas.tsx` as controlled React Flow container.

**Exit:** every glyph renders correctly (composite, N-ary, recursive, ISA); placement/drag/resize/connect work; smart guides + grid snap work.

### 10.7 Phase 5 — I/O codecs (≈3–4 days; blocked on SUPSI sample)

- Codec contract + `Result`-typed parse.
- `chen-native-json` (schema v1).
- **Await SUPSI XML fixture.**
- Align native JSON output shape to minimise Java-XML transform distance.
- Port + clean Java XML codec. Coordinate conversion at boundary.
- `chen-png` (React Flow `toImage`), `chen-svg` (DOM serialiser), `chen-mermaid`.
- Round-trip tests: every codec; Java XML round-trips SUPSI fixture byte-clean.

**Exit:** SUPSI fixture round-trip passes byte-clean — **hard acceptance gate**.

### 10.8 Phase 6 — UI shell (≈4–5 days)

- Rewrite menu, toolbar, property panel. One file per panel / per element's property editor.
- Right-click context menu.
- Toast system.
- Cheatsheet modal.
- Error modal surfacing codec failures.
- Drag-from-toolbar.
- Inline rename for labels + cardinality + role.
- Moodle exam-mode UI enforcement.

**Exit:** integration test — creating → renaming → saving → reopening through full UI produces identical state. Feature parity with legacy modulo removed features.

### 10.9 Phase 7 — Platform + i18n (≈2–3 days)

- Moodle bridge in `platform/moodle/bridge.ts` with strict origin validation + typed event schema.
- File I/O in `platform/fs/`; image export in `platform/imageExport/`.
- Complete Italian bundle; locale-key linter in CI.
- Query-param handling: `?validation`, `?lang`, `?readonly`, `?embed`, `?examMode`.

**Exit:** all i18n keys present in both EN and IT; locale linter passes. Moodle bridge handles a mocked SUPSI-shaped host.

### 10.10 Phase 8 — Acceptance + cutover (≈1–2 days)

- Full E2E suite green.
- Performance targets met (§7.11).
- Manual smoke test against a real or staged Moodle instance.
- SUPSI fixture round-trip green.
- Bundle size within budget (target <500 KB gzip).
- Delete `src/legacy/` and the `legacy-isolation` ESLint rule.
- Merge `v2` → `main` as replacement; tag `v2.0.0`.

**Exit:** `main` is v2. All tests green. Legacy gone.

### 10.11 Aggregate estimate

~3–4 weeks of focused work, sensitive to SUPSI XML sample timing.

### 10.12 Parallelism

Phases 1, 2, 3 overlap (pure layers). Phase 4 serialises on 1–3. Phase 5 parallels 6 (codecs vs UI). Phase 7 is last.

### 10.13 Sub-project map

- **Sub-project 2 (Refactor Execution)** = Phases 0–8 above.
- **Sub-project 3 (Testing Foundation)** = folded into every phase.
- **Sub-project 4 (Feature Excellence Pass)** = deferred items (validation panel, advanced edge routing, full touch gestures, mobile UX, cross-document paste, visual regression tests, etc.).
- **Sub-project 5 (Documentation Site)** = parallel with Phases 6–8.

---

## 11. Acceptance criteria

The v2 rewrite is "done" when **all** of the following hold:

1. Every phase's exit criteria met (§10).
2. Full Playwright E2E suite green in CI.
3. Coverage targets met per §8.8.
4. **SUPSI Java XML fixture round-trips byte-clean** (load → no-op → save → diff = 0 lines).
5. Performance targets met for 100-node / 200-edge diagram (§7.11).
6. Italian locale bundle complete; locale-key linter passes.
7. All 33 Chen validation rules implemented and tested.
8. Moodle bridge passes end-to-end against a real or staged SUPSI instance.
9. Bundle size ≤ 500 KB gzipped.
10. `src/legacy/` deleted; `main` tagged `v2.0.0`.

---

## 12. Appendices

### 12.1 ESLint config sketch

```js
// eslint.config.js additions
rules: {
  'max-lines': ['warn', { max: 350, skipBlankLines: true, skipComments: true }],
  'max-lines-per-function': ['warn', 100],
  'complexity': ['warn', 15],
  'no-restricted-syntax': [
    'error',
    { selector: 'ExportDefaultDeclaration', message: 'Use named exports.' },
  ],
  'no-restricted-imports': [
    'error',
    { patterns: [{ group: ['**/legacy/**'], message: 'legacy/ is reference-only.' }] },
  ],
}

// boundaries plugin (or equivalent custom rule) enforcing:
//   domain     <- (nothing)
//   platform   <- domain
//   state      <- domain
//   interaction<- domain, state
//   notation   <- domain
//   canvas     <- domain, state, interaction, notation
//   ui         <- everything below
//   app        <- everything
```

### 12.2 SUPSI XML fixture plan

- **Acquisition**: user (skiran017) to supply a real SUPSI-produced `.xml` file.
- **Location**: `tests/fixtures/supsi/<descriptive-name>.xml`.
- **Use**:
  - Regression test (Phase 5 + Phase 8).
  - Reference for native-JSON format alignment (Phase 5).
  - Manual inspection to verify entity sizes, coordinate conventions, connection routing patterns, and any Java-specific quirks.
- **Multiple samples welcome** if available — different diagrams stress different codec paths.

### 12.3 Deferred items (see BACKLOG.md for live list)

Tracked in `docs/superpowers/BACKLOG.md`:
- Free-form annotations (removed; revisit if demanded).
- JPEG export (removed).
- Rotation (removed).
- In-app tutorial (removed).
- Validation list panel (deferred to Sub-project 4).
- Old-custom-standard-XML migration codec.
- Per-element style overrides.
- Obstacle-avoiding edge routing.
- Mobile phone UX.
- Cross-tab clipboard paste.
- Incremental validation (optimisation).
- Visual regression tests.

### 12.4 Open items

1. **Native JSON format final shape** — deliberate deferral. Decided during Phase 5, after the SUPSI XML sample is in hand and we can align structure to minimise Java codec transform cost. The domain model is fixed; only the on-disk JSON shape is open.
2. **ISA triangle default orientation** — top-down (parent above children) by default, matching legacy. Confirmed during Phase 4 against VALIDATION.md diagrams.
3. **Recursive-relationship role-label discipline** — **decided: enforce distinct non-empty `role` strings** on both edges when `sourceId === targetId`. Added as invariant #9 in Phase 1.

---

*End of blueprint.*
