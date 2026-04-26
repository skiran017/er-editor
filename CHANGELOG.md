# Changelog

All notable changes to this project will be documented in this file.

## [v2 / Phase 5] — 2026-04-26

### Added
- [src/notation/chen/codecs/](src/notation/chen/codecs/) — codec layer.
  - [chenJavaXmlCodec](src/notation/chen/codecs/javaXml/index.ts) — the SUPSI Java XML format. Two-layer architecture: reader/writer (1:1 mirror of `XMLReader.java` / `XMLWriter.java`) ↔ JavaModel intermediate ↔ transformer ↔ Diagram. Byte-clean SUPSI fixture round-trip on all 5 fixtures (`conference-sol.xml`, `xml.xml`, `test.xml`, `er-java.xml`, `er-diagram-java-1767873101060.xml`).
  - [mermaidCodec](src/notation/chen/codecs/mermaid.ts) — Mermaid `erDiagram` export. Crow's-foot syntax, identifying vs non-identifying connectors, generalizations as comments.
  - Codec registry at [index.ts](src/notation/chen/codecs/index.ts) with `codecs[]` + `codecById(id)`.
- [src/notation/chen/codecs/types.ts](src/notation/chen/codecs/types.ts) — `Codec` contract from spec §6.5 with `Result<T>` for parse failures.
- [tests/fixtures/supsi/](tests/fixtures/supsi/) — 5 SUPSI fixtures + JAR-decompiler reference under `/Users/kiri/SUPSI/` (outside repo).
- [src/ui/menu/useFileActions.ts](src/ui/menu/useFileActions.ts) — Menu's Open / Save / Export Mermaid handlers wired through `chenJavaXmlCodec` + `mermaidCodec` + `platform/fs`.
- Transient `Diagram.databaseName`, `Diagram.databaseLastId`, `Diagram._javaXmlPositions`, `Diagram._javaXmlKeyOrders` fields preserve Java XML round-trip metadata. Not persisted, prefixed with `_javaXml` to mark them as codec-private.
- Coverage thresholds for `src/notation/chen/codecs/**` (90/85/90/90).

### Changed
- [src/ui/menu/Menu.tsx](src/ui/menu/Menu.tsx) — `toastPhase5` stubs replaced with real handlers. `Export PNG`, `Export SVG`, `Export Mermaid` rows all functional.

### Hard acceptance gate cleared
- **SUPSI Java XML byte-clean fixture round-trip** (spec §10.7): `conference-sol.xml` and 4 other fixtures load → save → diff = 0 lines.

### Deferred
- Moodle postMessage bridge (still parked — needs a host script).
- Cross-document clipboard paste (Sub-project 4).
- Native JSON codec (skipped per project decision — Java XML IS the save format).
- ISA disjoint/overlapping constraint (BACKLOG.md, pre-Phase-4 spec addendum).

## [v2 / Phase 7] — 2026-04-26

### Added
- [src/app/queryParams.ts](src/app/queryParams.ts) — central, case-insensitive parser for `?lang`, `?validation`, `?readonly`, `?embed`, `?examMode`. `examMode` delegates to it (no separate parser).
- [src/platform/fs/](src/platform/fs/) — `openFile` (handles `change` AND `cancel` events) + `downloadBlob` primitives.
- [src/platform/imageExport/](src/platform/imageExport/) — `toPng` (wraps `html-to-image` since React Flow v12 dropped its built-in helper) + `toSvg` (DOM serialiser, namespace-aware).
- [src/app/applyLanguage.ts](src/app/applyLanguage.ts) + [src/app/applyValidation.ts](src/app/applyValidation.ts) + [src/app/applyMode.ts](src/app/applyMode.ts) — URL → store apply helpers, called once at boot from main.tsx.
- `uiStore.readonly` + `uiStore.embed` — transient (non-persisted) flags driven by `?readonly` / `?embed`.
- Action-layer readonly gate in [src/interaction/actions.ts](src/interaction/actions.ts) — early-returns 13 mutating actions when `uiStore.readonly === true`. Selection / viewport / toast / cheatsheet stay live.
- UI-layer readonly hiding — Toolbar element tools, panel delete buttons, attribute add input, menu Reset row all disappear under readonly. Hide-not-disable mirrors the examMode discipline.
- Embed-mode chrome hiding — Menu and Toolbar both early-return null under `?embed=true`; Canvas + property panel + overlays remain live for iframe/Moodle hosts.
- [src/ui/primitives/LanguageToggle.tsx](src/ui/primitives/LanguageToggle.tsx) — EN/IT segmented pill rendered next to the Theme selector inside the Menu.
- i18next subscriber in [src/app/bootstrap.ts](src/app/bootstrap.ts) — keeps `i18next.language` in sync with `uiStore.language`. Both URL and toggle write the same flag.
- Italian translations for all six UI bundles (`common`, `toolbar`, `menu`, `properties`, `modals`, `validation`). Best-effort by the implementer; native-speaker review tracked in BACKLOG.md.
- `pnpm lint:locales` ([scripts/check-locales.ts](scripts/check-locales.ts)) — EN/IT key-parity audit + orphan/unresolved `t()` call detection. Wired into CI as a new step before Typecheck.
- Coverage thresholds for `src/platform/fs/**` and `src/platform/imageExport/**` (85/70/85/85).

### Changed
- [src/platform/i18n/init.ts](src/platform/i18n/init.ts) — `initI18n(lng?: Language)` accepts a parameter instead of hardcoding `'en'`. main.tsx reads `useUiStore.getState().language` (resolved by `applyLanguageFromUrl` earlier in boot) and passes it through. Layer rule preserved (`platform/` does NOT import `state/`; `Language` type duplicated locally).
- [src/state/uiStore.ts](src/state/uiStore.ts) — adds `readonly`, `embed`, `setReadonly`, `setEmbed`. Both excluded from the persist whitelist.
- [src/ui/menu/MenuDropdownBody.tsx](src/ui/menu/MenuDropdownBody.tsx) — Reset row gated behind a `showReset` prop (Menu.tsx passes `!readonly`). `ThemeSection` and `LanguageSection` extracted as local components to keep the parent under the 100-line lint cap.
- [src/app/examMode.ts](src/app/examMode.ts) — `resolveExamModeFromSearch` delegates to the central `parseQueryParams`.

### Deferred
- Moodle postMessage bridge — moves to the tail of Phase 5 once codecs land (so the `load` / `save` events can carry real payloads).
- Native-speaker review of the Italian bundles — tracked in BACKLOG.md.
- Wiring the Menu's Open / Save / Export actions to codecs via the new `platform/fs` + `platform/imageExport` primitives — Phase 5.

## [v2 / Phase 6] — 2026-04-23

### Added

- UI shell under [src/ui/](src/ui/) — menu, toolbar, property panel, overlays (toasts, modals, context menu), inline rename:
  - [app/AppShell.tsx](src/ui/app/AppShell.tsx) — three-pane responsive layout (toolbar ‖ canvas ‖ properties + overlay slot).
  - [toolbar/Toolbar.tsx](src/ui/toolbar/Toolbar.tsx) — reads `chenPlugin.tools`, dispatches `PICK_TOOL`, drag-from-toolbar via `application/x-er-tool` MIME.
  - [menu/](src/ui/menu/) — `MenuBar` + `FileMenu`/`EditMenu`/`ViewMenu`/`HelpMenu`. File menu stubs to Phase-5 toasts until codecs land.
  - [properties/](src/ui/properties/) — `PropertyPanel` + per-kind editors (`EntityProperties`, `RelationshipProperties`, `AttributeProperties`, `ISAProperties`, `EdgeProperties`) + `MultiSelectSummary` + `EmptyPanel`.
  - [overlays/](src/ui/overlays/) — `ToastStack` (auto-dismiss, errors manual), `ModalStack` + `CheatsheetModal` / `ConfirmModal` / `ErrorModal`, `ContextMenu`.
  - [canvas/hooks/useInlineRename.ts](src/canvas/hooks/useInlineRename.ts) + [canvas/InlineRenameOverlay.tsx](src/canvas/InlineRenameOverlay.tsx) — F2/Enter/dblclick inline rename. Hook lives canvas-side (the overlay consumes it; `canvas → ui` is forbidden by the layer rule).
  - [primitives/](src/ui/primitives/) — `Button`, `IconButton`, `TextInput`, `Checkbox`, `KeyboardShortcut`. Buttons default to `type="button"` to avoid accidental form submission.
- i18n bootstrap: [platform/i18n/init.ts](src/platform/i18n/init.ts) + `common`/`toolbar`/`menu`/`properties`/`modals` locale bundles for EN and IT (IT stubs copy EN — Phase 7 translates). Race-safe init via in-flight promise memoization.
- `uiStore.contextMenu` + `uiStore.inlineRename` slices (not persisted).
- FSM re-enters `connectToGeneralization.waitingForChild` state + new `CONNECT_CHILD_TO_ISA` event, reached via right-click on an ISA glyph. Matches spec §4.6; was deferred from Phase 3.
- FSM `RENAME` root-level handler upgraded from no-op to a `beginRenameSelected` action that calls `uiStore.startInlineRename` for the selected node.
- Shared `pickSeverity(errors)` selector in [state/selectors.ts](src/state/selectors.ts) — used by all four node containers (extracted during Task 4 refactor of Phase 4, consumed throughout Phase 6).
- Coverage thresholds for `src/ui/**` and `src/platform/i18n/**`.
- [src/ui/index.ts](src/ui/index.ts) barrel for ergonomic imports from `@/ui`.

### Changed

- `src/App.tsx` — mounts the full shell instead of just the canvas.
- `src/main.tsx` — initialises i18next before render (`void initI18n().then(() => createRoot(...).render(<App />))`).
- `src/canvas/ERCanvas.tsx` — mounts the `InlineRenameOverlay`.
- `src/canvas/notation-adapters/ISANode.tsx` — opens the context menu on right-click with "Add child entity".

### Notes

- Phase 5 codec actions are stubbed: File menu items push "Available in Phase 5" toasts. Real `save` / `open` / `export` wire up when Phase 5 lands.
- Phase 7 completes the Italian bundle and wires query-param overrides (`?lang`, `?readonly`, `?examMode`). Phase 6 does NOT populate the `readOnly` flag from the URL.
- The "create → rename → save → reopen" exit criterion (spec §10.8) is exercised by `src/ui/integration.test.tsx`'s JSON round-trip. A real codec round-trip replaces it in Phase 5.
- Context menu is a separate `uiStore.contextMenu` slice (not a modal) because it's cursor-anchored with outside-click + Escape dismissal — different lifecycle than centred modals.
- Per-editor property panels use a store-subscription pattern (`useDiagramStore((s) => s.diagram.nodesById[node.id])`) to stay reactive with controlled inputs — callers pass a `node` prop but the component re-reads live state.
- 642 unit tests passing; build, typecheck, and lint clean.

## [v2 / Phase 4] — 2026-04-22

### Added

- Rendering layer under [src/canvas/](src/canvas/) + [src/notation/chen/](src/notation/chen/):
  - [adapters/diagramToRf.ts](src/canvas/adapters/diagramToRf.ts), [adapters/rfToDiagramPatch.ts](src/canvas/adapters/rfToDiagramPatch.ts) — pure Diagram ↔ React Flow bridge, 100% covered.
  - [hooks/useFloatingEdge.ts](src/canvas/hooks/useFloatingEdge.ts) — intersection math (ported from RF's floating-edges example) + live node-lookup hook.
  - [hooks/useSnapping.ts](src/canvas/hooks/useSnapping.ts) — hook wrapper around `domain/snap.ts`; reads `uiStore.snap` config reactively.
  - [domain/snap.ts](src/domain/snap.ts) — pure grid + centre-alignment snap; guides (horizontal/vertical) returned for overlay rendering.
  - [notation-adapters/](src/canvas/notation-adapters/) — store-aware containers (`EntityNode`, `RelationshipNode`, `AttributeNode`, `ISANode`, `EntityRelationshipEdge`, `AttributeEdge`, `ISAEdge`) + `chenBindings.ts` assembling `nodeTypes`/`edgeTypes` for React Flow. Kept canvas-side because `notation/**` is domain-only per layer rules.
  - Pure glyphs under [notation/chen/nodes/](src/notation/chen/nodes/) + [notation/chen/edges/](src/notation/chen/edges/) — SVG, prop-driven, snapshot-stable.
  - [notation/chen/cardinality.tsx](src/notation/chen/cardinality.tsx) — Chen cardinality label + participation marker (filled for total, hollow for partial).
  - [notation/chen/toolbar.ts](src/notation/chen/toolbar.ts), [notation/chen/index.ts](src/notation/chen/index.ts) — `chenPlugin` with defaults (entity 120×60, relationship 140×70, attribute 90×50, ISA 100×60) matching spec §5.7.
- `NotationPlugin` / `Codec` / `ToolbarConfig` contracts in [notation/types.ts](src/notation/types.ts) (spec §5.6, §6.5).
- `uiStore.snap` config slice (grid off + 10 px, alignment on + 4 px by default), persisted under `er-editor:ui`.
- Shared `pickSeverity(errors)` selector in [state/selectors.ts](src/state/selectors.ts) — used by all four node containers.
- [canvas/ERCanvas.tsx](src/canvas/ERCanvas.tsx) — controlled React Flow wired to `diagramStore`, `viewportStore`, Phase 3 input hooks (`useMouse`/`useKeyboard`/`useTouch`), `useSnapping`, and the Chen plugin bindings. Renders an SVG guide overlay on top of the flow during drags.
- `installSubscribers()` from [app/bootstrap.ts](src/app/bootstrap.ts) finally called from [main.tsx](src/main.tsx) — Phase 2's debounced Chen validation + dev invariants now fire in production.
- Coverage thresholds:
  - `src/canvas/adapters/**` — 100/90/100/100 (spec §8.8).
  - `src/canvas/notation-adapters/**` — 80/70/80/80.
  - `src/canvas/**` — 80/70/80/80.
  - `src/notation/chen/nodes/**`, `src/notation/chen/edges/**` — 90/80/90/90.
  - `src/notation/chen/**` — 85/75/85/85.

### Changed

- `src/notation/types.ts` gained `NotationPlugin` + `Codec` + `ToolbarConfig` types. Existing `ValidationRule` / `ValidationCategory` exports unchanged. Dropped `string[]` fallback arm from `ParseResult` (tightened after Task 3 code review).
- `NotationNodeData` / `NotationEdgeData` converted from `interface` to intersection type with `Record<string, unknown>` — required to satisfy `@xyflow/react` v12's `Node<Data>` constraint (discovered during Task 4 follow-up).

### Notes

- `chenPlugin.nodeTypes` / `edgeTypes` are **empty placeholders** at the notation layer (domain-only). `canvas/notation-adapters/chenBindings.ts` holds the real React components; `ERCanvas` wires them into `<ReactFlow>` directly. Spec §5.6 is satisfied in shape — the plugin-contract surface is whole.
- Grid snap defaults to **off**; alignment guides default to **on** (§7.5). Equal-spacing guides are deferred (Sub-project 4).
- `nodesConnectable={false}` + `panOnDrag={false}` on `<ReactFlow>` — the Phase 3 FSM owns connection drawing and panning. React Flow only handles node-drag + zoom.
- Edge-container tests use a jsdom fixture shim: synthetic `handles` on `Node` objects to force RF v12's `EdgeWrapper` to mount (real DOM measurement doesn't happen in jsdom).
- Phase 4 exit (spec §10.6): every glyph renders (composite flagged, N-ary supported via multi-edge relationship nodes, recursive via role labels, ISA via triangle); placement/drag/resize/connect all go through the FSM; grid snap and smart alignment guides work. ✅
- Codec `parse`/`serialize` for `nativeJson` remain undefined — Phase 5 fills them after the SUPSI XML sample lands.
- 498 unit tests passing; build, typecheck, and lint clean.

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
