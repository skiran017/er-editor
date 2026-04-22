# ER Editor — Rewrite Backlog

Tracking doc for the multi-phase rewrite. Each sub-project gets its own brainstorm → spec → plan → implement cycle.

Status legend: 🟢 in progress · 🟡 queued · ⬜ not started

---

## Sub-project 1 · Target Architecture & Feature Audit 🟢

**The blueprint.** Defines module boundaries, atomicity rules, state-shape redesign, per-feature keep/change/remove/add decisions, "draw.io-smooth" target list, and migration strategy. Spec will live at `docs/superpowers/specs/YYYY-MM-DD-target-architecture-design.md`. Everything downstream references it.

## Sub-project 2 · Architecture Refactor Execution 🟡

Carve up the monolithic store (~1857 lines), `ERCanvas.tsx` (~64 KB), and `lib/` per the blueprint. Expected to break into multiple implementation plans (state slices → canvas layers → lib modules → component splits). Tests land with each seam.

## Sub-project 3 · Testing Foundation 🟡

No test suite today. Validation rules (28 active), XML round-trips (standard + Java), and interaction state machines are the priority targets. May fold into #2 or stand alone — decide during #1.

## Sub-project 4 · Feature Excellence Pass 🟡

One sub-spec per feature area, driven by the blueprint's "draw.io-smooth" target list. Likely members:

- Orthogonal connection routing (Java compatibility, highest-risk gap)
- Copy / Cut / Paste
- Lasso multi-select + group ops
- Auto-layout / align / distribute / snapping
- Touch gestures + responsive layout parity
- Keyboard model (full shortcut surface + modal cheatsheet)
- Italian i18n completion
- Java XML round-trip verification (entity sizing 80×40 vs 100×50, relationship dynamic sizing)
- On-canvas direct editing beyond name rename

## Sub-project 5 · Documentation Site (dev + user, deployed) 🟡

Tooling decision (VitePress / Docusaurus / Astro Starlight), information architecture (dev docs: architecture, contribution, API, decision log · user docs: tutorial, reference, Moodle embed guide, validation rules), deployment target (GitHub Pages / Vercel / linked from Moodle), versioning, contribution workflow. Can proceed in parallel with #2–#4.

---

## Parking lot (things noticed during exploration, revisit during relevant sub-project)

- Moodle `postMessage` bridge uses wildcard origin as fallback — tighten during #4 Moodle work.
- Validation runs eagerly on every mutation — consider incremental validation during #2.
- Composite attributes partially implemented in types but canvas/UI support incomplete.
- `validationEnabled` not persisted across reloads.
- No error recovery for malformed XML import.
- Connection hit area is thin — hard to click; revisit during #4.
- `public/moodle-essay-er-editor.js` host script needs end-to-end round-trip test.

## SUPSI Java XML compatibility (hard acceptance criterion)

- SUPSI's Java app (ERDesigner.jar) produces XML. The `chen-java-xml` codec is the compatibility contract.
- User will share a sample file. **Once received, drop it in `tests/fixtures/supsi/` as a permanent regression fixture.**
- **Acceptance criterion for Sub-project 2:** load → edit unrelated elements → save → diff — the XML must be byte-clean for every element we didn't touch. No whitespace drift, no attribute reordering, no default-value injection.
- Known prior gaps to re-verify against the real file: entity sizing (Java 80×40), orthogonal connection routing, relationship dynamic sizing, ID numeric↔nanoid mapping stability across round-trips.
- **Native-JSON format naming:** when the SUPSI sample arrives, review its element tags and group our native-JSON output shape to minimise codec transform cost (shape-alignment only — the domain model stays clean and notation-agnostic).

## Phase 8 pre-cutover bundle-size audit checklist

- **Dual Zustand versions** in the runtime bundle: `@xyflow/react@12` bundles its own internal `zustand@4.x` while our stores use `zustand@5.x`. Both land in production unless tree-shaking eliminates one — verify during the Phase 8 <500 KB gzip target check.
- **Dual nanoid versions**: `nanoid@3` (transitive via `postcss`) vs our declared `nanoid@5`. Tiny package, but note during the same audit.

## ISA disjoint/overlapping constraint (pre-Phase-4 spec addendum)

Chen EER notation supports a **disjoint (d) vs overlapping (o)** constraint on generalization hierarchies, in addition to the already-modeled total/partial. Academic sources (Elmasri & Navathe, UCT lecture notes, TutorialsPoint EER guide) treat this as canonical EER. Not in the current spec §3.2 data model (`ISANode` has only `isTotal`).

**Required before Phase 4 (ISA glyph rendering):**
- Spec amendment: add `readonly isDisjoint: boolean` to `ISANode`.
- Two new validation rules:
  - **G-disjoint:** if `isDisjoint=true`, runtime semantics note (soft reminder, not a structural check — inheritance constraint enforced at instance-level, not diagram-level).
  - **G-overlap-impl:** flag composite-constraint conflicts (e.g., total+disjoint is the most-constrained; partial+overlapping is least).
- Phase 4 rendering: add "d" or "o" marker inside/next to the ISA triangle.
- Phase 5 Java XML codec: map the Java ERDesigner's disjoint/overlap tags if present; otherwise default to disjoint.

## Additional validation rules deferred to Sub-project 4

- **Diagram connectivity warning** — flag isolated subgraphs (no path between two entity clusters). Soft warning.
- **1:1 asymmetric total participation** — flag 1:1 relationships where one side is total and the other is partial. Stylistic warning (still semantically valid).
- **M:N with relationship attributes → associative entity hint** — soft hint suggesting the M:N should be decomposed into a new associative entity + two 1:N relationships.
- **A7 "simple attribute must not be subdivided"** — currently covered obliquely by rule 3.12 (sub-attributes cannot be composite); re-evaluate if an explicit rule adds value.

## Phase 0 follow-ups (track for Phase 1 or later)

- **`eslint-plugin-import/order`** — spec §8.6 item 8 lists it as a required rule; Phase 0 did not install it. Revisit when Phase 1 lands the first domain files; if import ordering is intentionally deferred, update the spec to match.
- **E2E "no console errors" assertion fragility** — [tests/e2e/smoke.spec.ts](tests/e2e/smoke.spec.ts) may flap once Phase 4 adds React Flow custom nodes that log dev-mode warnings. When that happens, filter to a known-harmless allowlist or narrow the assertion to `[Error]` severity.
- **Vitest coverage thresholds** — spec §8.8 sets per-layer coverage targets (domain ≥95 %, rules ≥90 %, state ≥85 %, etc.). Add to `vitest.config.ts` `coverage.thresholds` as each phase lands its layer.
- **ESLint layer rules only catch `@/…` alias imports** — relative-parent `../state/foo` imports slip through. Acceptable today because a consistent codebase convention catches this in code review. Revisit if violations sneak in.

## Deferred / removed from v1 scope (revisit when relevant)

- **Free-form lines & arrows** (removed) — revisit only if students/profs request annotation capabilities.
- **JPEG export** (removed) — PNG + SVG cover the need.
- **`rotation` on entity/relationship** (removed) — not standard Chen; no demand.
- **In-app tutorial / first-run overlay** (removed) — user docs (Sub-project 5) carry the onboarding load.
- **Validation list panel** — v1 ships only the per-element warning badge + tooltip; the list panel moves to Sub-project 4.
- **Old-custom-standard-XML migration codec** — skipped; only build if we find saved files in that format.
- **Per-element style overrides** (color, border) — not in core model; parallel `styleById` map if added later.
- **Obstacle-avoiding edge routing** — React Flow doesn't do it; revisit if diagrams grow cluttered enough to need it.
- **Mobile (phone) UX** — Sub-project 4 stretch.
- **Cross-tab / cross-document clipboard paste** — Sub-project 4 stretch.
