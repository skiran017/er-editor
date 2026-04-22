# Changelog

All notable changes to this project will be documented in this file.

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
