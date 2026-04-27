# ER Editor — Bug Fixes & Feedback Tracker

Professor feedback and bug fixes, tracked phase-by-phase.

---

## Phase 1 — Quick Bugs ✅

| # | Issue | Status |
|---|-------|--------|
| 1 | Dangling dashed line when exiting connect tool without finishing | ✅ Fixed |
| 2 | Double-click rename not working in select mode (entities only) | ✅ Fixed |
| 3 | "Partial key" renamed to "Discriminant" across entire codebase | ✅ Fixed |

## Phase 2 — Logic Bugs ✅

| # | Issue | Status |
|---|-------|--------|
| 4 | "Already connected" error blocking multiple relationships between same entity pair | ✅ Fixed |
| 5 | Mobile: can't add attributes from canvas (only from property panel) | ✅ Fixed |
| 6 | Click on empty canvas to deselect not working in all modes | ✅ Fixed |

## Phase 3 — UX Polish (In Progress)

| # | Issue | Status |
|---|-------|--------|
| 7 | Connection lines don't update during group drag (jump at the end) | ✅ Fixed |
| 8 | Remove cardinality/participation text labels (symbols already convey it) | ✅ Fixed |
| 7b | Attribute line detached when dragging by attribute in group selection | ⬜ Pending |
| 7c | Lines not updating in real time during resize/transform | ✅ Fixed |
| 7d | After unselect, selection not cleared — can still move diagram as group | ✅ Fixed |

## Phase 4 — Validation Overhaul ✅

| # | Issue | Status |
|---|-------|--------|
| 9 | ISA restructured children wrongly flagged for missing attributes/discriminant | ✅ Fixed |
| 10 | Weak entity on 1-side of 1-N relationship not flagged as error | ✅ Fixed |
| 11 | Multivalued primary key not flagged as error | ✅ Fixed |
| 12 | ISA children wrongly require a key attribute | ✅ Fixed |
| 13 | Thorough validation checks per ER design rules | ✅ Complete (28/33 rules implemented) |

### Newly Implemented Rules (13)
- ✅ Rule 1.4: Weak entity must have total participation in identifying relationship
- ✅ Rule 1.6: Weak entity must connect to exactly one identifying relationship
- ✅ Rule 3.6: Discriminant cannot be multivalued
- ✅ Rule 3.7: Relationship attributes cannot be key attributes
- ✅ Rule 5.3: Generalization should have at least 2 children
- ✅ Rule 5.6: ISA children should not be weak entities
- ✅ Rule 6.1: Orphan entity warning

## Phase 5 — New Features

| # | Issue | Status |
|---|-------|--------|
| 14 | Composite attributes (not implemented) | ⬜ Pending |
| 15 | Moodle integration (see notes below) | ⬜ Pending |

---

## Phase 5 — Moodle Integration Notes (Raw XML + Java Compatibility)

Reference: [moodle-essay-drawio](https://github.com/slashdotted/moodle-essay-drawio) — embedding pattern we will adapt for ER Editor.

### Integration Goal

- Store **raw ER XML string** directly in Moodle essay textarea (no JSON wrapper).
- Use iframe + `postMessage` bridge between Moodle page and ER Editor.
- Keep output compatible with current ER Editor import/export, and provide a clear path for Java app interoperability.

### Step-by-Step Implementation Plan

#### Step 1 — Define message contract (freeze before coding)

Use a strict message schema with `source` + `type`:

- **Parent (Moodle) → Editor iframe**
  - `{ source: "moodle-er-host", type: "init", xml: "<ERDiagram...>" }`
  - `{ source: "moodle-er-host", type: "load", xml: "<ERDiagram...>" }`
  - `{ source: "moodle-er-host", type: "setReadOnly", value: true|false }`
- **Editor iframe → Parent (Moodle)**
  - `{ source: "er-editor", type: "ready" }`
  - `{ source: "er-editor", type: "autosave", xml: "<ERDiagram...>" }`
  - `{ source: "er-editor", type: "save", xml: "<ERDiagram...>" }`
  - `{ source: "er-editor", type: "error", message: "..." }`

#### Step 2 — Add embed mode entrypoint in ER app

- Use URL flags: `?embed=true&examMode=true`.
- In embed mode:
  - Keep canvas/tools needed for drawing.
  - Hide file-import/export actions and non-essential UI.
  - Keep exam restrictions enabled.

#### Step 3 — Implement iframe bridge inside ER app

- On app boot, send `ready` to parent.
- Listen for `init` / `load` messages:
  - Parse incoming XML.
  - Load into store (`loadDiagram` replace mode).
- On diagram changes:
  - Serialize diagram to **standard XML** string.
  - Debounce and send `autosave`.
- On blur/unmount/manual trigger:
  - Send `save` with latest XML.

#### Step 4 — Create `moodle-essay-er-editor.js` host script

- Find `textarea.form-control`, hide it, mount iframe into `<div id="er_editor"></div>`.
- Use `DOMContentLoaded` (not `window.onload`).
- On iframe `ready`, send `init` with current `textarea.value` (if empty, send empty XML).
- On `autosave`/`save`, write XML back to `textarea.value`.
- Trigger `input`/`change` events after write, so Moodle reliably captures updates.

#### Step 5 — Security hardening

- Validate `event.origin` (no wildcard in production).
- Validate `source` and `type` fields before processing.
- Use strict `targetOrigin` in `postMessage`.
- Ignore unknown events safely.

#### Step 6 — Review/Grading mode

- On attempt review page:
  - Load stored XML via `init/load`.
  - Send `setReadOnly: true` (or use `?readOnly=true`).
  - Disable autosave in read-only mode.

#### Step 7 — End-to-end validation checklist

1. New attempt opens with blank diagram.
2. Editing triggers autosave and updates textarea.
3. Reload restores last saved diagram from textarea XML.
4. Submission stores XML in Moodle response.
5. Review renders same diagram in read-only mode.
6. Invalid XML path handled gracefully with user-visible error.

### Java App Compatibility Plan

Canonical storage in Moodle will be **standard ER XML**.

- Why: standard XML is already first-class in this editor and easiest for autosave.
- Java app compatibility options:
  1. **Recommended:** keep Moodle storage in standard XML; when needed, convert using existing **Export Java XML** flow.
  2. **Optional enhancement:** add embed query param `format=java` so iframe autosave emits Java XML directly for Moodle instances that require it.

This keeps Moodle integration simple now while preserving interoperability with the Java app ecosystem.

### Moodle Question Setup Template

Use Essay question with plain text response format, and include:

```html
<script src=".../moodle-essay-er-editor.js"></script>
<div id="er_editor"></div>
```

### Operational Notes

- One essay editor question per page remains the safest setup.
- If cross-origin hosting is used, keep origin allowlists in sync between script and iframe app.
- Log protocol errors in console during rollout, then reduce logging once stable.

---

## Notes

- Phase 1–3 fixes are code-complete; Phase 4–5 pending.
- Validation overhaul (Phase 4) requires a careful rule-by-rule audit against ER theory.
- Composite attributes (Phase 5) need type, store, canvas, property panel, and serializer changes.
- **Recent fixes (7c, 7d):** Resize/transform live line updates (ref + forceUpdate, preview passed to all shapes); selection clear now removes drag handlers from nodes when unselecting.
