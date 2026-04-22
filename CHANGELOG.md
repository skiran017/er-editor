# Changelog

All notable changes to this project will be documented in this file.

## [v2 / Phase 3] — 2026-04-22

### Added

- `src/interaction/` layer — full XState v5 editorMachine + support modules:
  - [events.ts](src/interaction/events.ts) — typed `EditorEvent` union covering canvas + node + edge pointer events, resize handles, history, clipboard stubs, selection ops, viewport, rename, modal confirm/cancel, cheatsheet.
  - [context.ts](src/interaction/context.ts) — machine context with transient drag/connection/resize fields.
  - [guards.ts](src/interaction/guards.ts) — 8 pure predicates over Diagram.
  - [actions.ts](src/interaction/actions.ts) — side-effectful action functions calling `useXStore.getState()`. `connectNodes` split into per-tool helpers (`connectViaQuickRelationship`/`…QuickGeneralization`/`…ConnectTool`).
  - [machine.ts](src/interaction/machine.ts) — `editorMachine` with 8 top-level states: idle, selecting.{idle,rubberBand,maybeDragging,dragging,resizing}, panning.{idle,active}, placing.{entity,relationship,attribute,isa}, drawing.{idle,connection.fromPicked}, quickRelationship.{idle,firstPicked}, quickGeneralization.{idle,firstPicked}, connectToGeneralization.waitingForChild.
  - [keybindings.ts](src/interaction/keybindings.ts) — 28-binding registry with cross-platform Ctrl/Meta aliases + `matchKeybinding(e)` O(1) lookup.
  - [interactionStore.ts](src/interaction/interactionStore.ts) — Zustand store wrapping the actor; replaces the Phase 2 stub.
  - [integration.test.ts](src/interaction/integration.test.ts) — 3 end-to-end flows (place → quick-rel, place → undo, rubberband-select).
- `src/canvas/hooks/`:
  - [useKeyboard.ts](src/canvas/hooks/useKeyboard.ts) — global keydown listener; skipped when focus is in input/textarea/contenteditable.
  - [useMouse.ts](src/canvas/hooks/useMouse.ts) — pointer + wheel handlers; touch-type pointers delegated to useTouch; Ctrl/Meta+wheel → `WHEEL_ZOOM`.
  - [useTouch.ts](src/canvas/hooks/useTouch.ts) — single-finger touch; multi-touch gestures deferred to Sub-project 4.
- Barrels: [src/interaction/index.ts](src/interaction/index.ts), [src/canvas/hooks/index.ts](src/canvas/hooks/index.ts).
- Coverage thresholds: interaction 90/75/60/90, canvas/hooks 85/70/85/85. (Lower function threshold on interaction reflects XState's many tiny arrow functions in the `setup({guards, actions})` block that are dispatched through state-transition coverage but not all individually invoked per test.)

### Changed

- `src/state/interactionStore.ts` (Phase 2 stub) DELETED. `useInteractionStore` now lives in `src/interaction/interactionStore.ts`. `src/state/index.ts` dropped its re-export. Consumers import from `@/interaction`.

### Notes

- Every state in the machine is reachable, every declared `EditorEvent` has an explicit handler (including Phase-4/6 no-ops with TODO comments), and the `event exhaustiveness` suite in `machine.misc.test.ts` iterates all deferred events to prove the machine accepts them without throwing. The `connectToGeneralization` state from spec §4.6 was scaffolded in the plan but removed during final-review cleanup because it had no `PICK_TOOL` route — it re-enters in Phase 6 when the right-click-on-ISA UI is wired.
- Machine handles `FIT` / `ZOOM_IN` / `ZOOM_OUT` directly (viewport actions); `RENAME` / `CYCLE_SELECTION` / `INVERT_SELECTION` / `CONFIRM` / `CANCEL` / `HANDLE_POINTER_DOWN` / `EDGE_POINTER_DOWN` are acknowledged-but-deferred events with inline comments naming the phase that implements them.
- Keybindings added post-review: `Space` as pan-tool shortcut (spec §7.2), `Shift+Alt+A` for invert-selection (spec §7.6).
- `useMouse.onWheel` calls `e.preventDefault()` on zoom events to stop the browser's pinch-to-zoom / page-scroll.
- `src/canvas/ERCanvas.tsx` still renders a blank React Flow canvas. Phase 4 will mount the new hooks onto it and plug in the Chen glyph components.
- 372 unit tests passing; build, typecheck, and lint clean.

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
- Coverage thresholds enforced for `src/state/**` and `src/app/**` (≥85% stmts/funcs/lines, ≥80% branches). Actual: state 95% stmts, app 95% stmts.

### Changed

- `ValidationSeverity` and `ValidationError` types moved from [src/notation/types.ts](src/notation/types.ts) to [src/domain/types.ts](src/domain/types.ts) so the state layer can import them (state → notation would violate layer boundaries). `src/notation/types.ts` re-exports them for backward compatibility.

### Notes

- No React components produced in Phase 2; `src/canvas/ERCanvas.tsx` still renders a blank React Flow canvas — Phase 4 wires it to the stores.
- Stores never import each other. All cross-store coordination lives in `commands.ts` and `bootstrap.ts`.
- Persistence is opt-in: only `uiStore.{theme, language, panels}` and `validationStore.enabled` hit `localStorage`. Diagram never auto-persists.
- 242 unit tests passing; build, typecheck, and lint clean.

## [v2 / Phase 1] — 2026-04-22

### Added

- Pure domain layer: `Diagram` indexed container, `ERNode` / `ERLink` discriminated unions, branded `NodeId` / `EdgeId`, geometry and graph utilities ([src/domain/](src/domain/)).
- 9 structural invariants ([src/domain/invariants.ts](src/domain/invariants.ts)) as pure predicates returning `InvariantViolation[]`.
- Chen validation catalog: 33 rules across entity (10), relationship (7), attribute (12), generalization (3), structural (1) categories, each a pure `(Diagram) => ValidationError[]` ([src/notation/chen/rules/](src/notation/chen/rules/)).
- English + Italian (English-fallback) i18n message bundles for all 33 rule keys ([src/platform/i18n/locales/](src/platform/i18n/locales/)).
- Diagram fixture factories ([tests/fixtures/diagrams/](tests/fixtures/diagrams/)) + `@fixtures` vitest alias.
- Coverage thresholds enforced via `vitest.config.ts`: ≥95% in `src/domain/**`, ≥90% in `src/notation/chen/rules/**`. Current state: domain 97%, rules 100%.

### Notes

- No React, Zustand, XState, or React Flow imports in any Phase 1 file.
- `src/canvas/ERCanvas.tsx` and `src/app/` intentionally untouched — Phase 2 (state) and Phase 4 (rendering) own those changes.
- 178 unit tests passing; build, typecheck, and lint clean.
