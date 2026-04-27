# State

The state layer (`src/state/`) is six Zustand stores. Each owns one slice of reactive truth. Components subscribe via selectors; mutations go through store actions, never `setState` from the outside.

## The six stores

| Store | What it owns | Persisted? |
|---|---|---|
| `useDiagramStore` | The current `Diagram`. Wrapped with `zundo` for undo/redo. | No (the user saves explicitly). |
| `useSelectionStore` | Selected node ids, selected edge ids, rubberband state. | No. |
| `useViewportStore` | `pan` and `zoom`. | No. |
| `useUiStore` | Theme, language, panel toggles, modals stack, toasts, snap, exam/readonly/embed flags. | **Yes** (theme, language, panels, snap; via `zustand/middleware/persist`). |
| `useValidationStore` | Errors / warnings keyed by node id, plus the on/off toggle. | No. |
| `useInteractionStore` | Mirrors the FSM snapshot for components that want to read tool / context state. | No (FSM is source of truth). |

## Diagram store shape

<<< ../../../src/state/diagramStore.ts#diagram-store-state

Mutators (`addNode`, `updateNode`, `applyPatch`, etc.) are plain methods on the store. They call into pure helpers in `src/domain/` and set the next diagram via Zustand's immer middleware.

## Subscriptions

Cross-store reactions are wired in `src/app/bootstrap.ts` (called from `src/main.tsx`). The bootstrap subscribes:

- Diagram changes → invariant check (dev) + debounced validation run (when validation is enabled).
- Validation toggle → recompute or clear errors immediately.
- Exam mode → force validation off.
- Language → sync `i18next.changeLanguage`.

## Undo / redo

`useDiagramStore` is wrapped with [zundo](https://github.com/charkour/zundo) — `useDiagramStore.temporal.getState()` exposes `undo()`, `redo()`, `pastStates`, `futureStates`. The toolbar reads `pastStates.length` and `futureStates.length` reactively to enable / disable the undo / redo buttons.

## Where to next

- [Concepts: Interaction FSM](./interaction-fsm) — how user input becomes store mutations.
- [API Reference: state](../../api/state/) — every store, every action, every selector.
