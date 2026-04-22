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
