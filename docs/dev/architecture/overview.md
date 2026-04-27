# Architecture overview

The editor is a layered SPA. Each layer has one job and only depends on layers to its left. Most of the complexity is concentrated in the **interaction** layer (an XState v5 finite state machine) and the **state** layer (six Zustand stores).

```
domain ──▶ state ──▶ interaction ──▶ canvas ──▶ ui
   │
   └────▶ notation (Chen plugin)
```

## Layers

| Layer | Path | Responsibility |
|---|---|---|
| **domain** | `src/domain/` | Pure data types (`Diagram`, `Node`, `Edge`, branded ids) and pure helpers (geometry, invariants). No React, no stores, no DOM. |
| **state** | `src/state/` | Six Zustand stores: diagram (with zundo for undo/redo), selection, viewport, ui (persisted), validation, interaction. |
| **interaction** | `src/interaction/` | XState v5 machine that owns "what tool is active, what's the next valid event." Mouse / keyboard / touch hooks dispatch typed events; the machine routes them. |
| **canvas** | `src/canvas/` | React Flow integration. Adapters convert `Diagram` → React Flow nodes/edges. Handles drag, snap, rubberband, connection preview overlays. |
| **ui** | `src/ui/` | App shell, menu, toolbar, property panel, modals, overlays. The bits a user sees outside the canvas. |
| **notation** | `src/notation/` | Notation plugins (currently Chen only). Each plugin owns its node renderers, edge renderers, validation rules, and codecs. |

## Data flow

A typical edit:

1. User picks a tool — `Toolbar` dispatches `PICK_TOOL` to the FSM.
2. User clicks the canvas — `useMouse` dispatches `CANVAS_POINTER_DOWN` + `CANVAS_POINTER_UP`.
3. The FSM sees `placing.entity` + `CANVAS_POINTER_UP` and runs the `placeNode` action.
4. The action calls `useDiagramStore.getState().addNode(...)`.
5. The store update fires the **bootstrap subscriber** (`src/app/bootstrap.ts`), which runs validation and pushes invariant violations to the console in dev.
6. React Flow re-renders from the diagram-to-RF adapter.

## Where to next

- [Layers](./layers) — the import-direction rule in detail.
- [Concepts: Domain](../concepts/domain) — the data types behind everything.
- [Concepts: State](../concepts/state) — what each Zustand store owns.
- [Concepts: Interaction FSM](../concepts/interaction-fsm) — the state machine.

For the full architectural design, see [`docs/superpowers/specs/2026-04-22-target-architecture-design.md`](../../superpowers/specs/2026-04-22-target-architecture-design.md).
