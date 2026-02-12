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

## Phase 4 — Validation Overhaul

| # | Issue | Status |
|---|-------|--------|
| 9 | ISA restructured children wrongly flagged for missing attributes/discriminant | ✅ Fixed |
| 10 | Weak entity on 1-side of 1-N relationship not flagged as error | ✅ Fixed |
| 11 | Multivalued primary key not flagged as error | ✅ Fixed |
| 12 | ISA children wrongly require a key attribute | ✅ Fixed |
| 13 | Thorough validation checks per ER design rules | 🔄 In Progress |

## Phase 5 — New Features

| # | Issue | Status |
|---|-------|--------|
| 14 | Composite attributes (not implemented) | ⬜ Pending |
| 15 | Moodle integration (see notes below) | ⬜ Pending |

---

## Phase 5 — Moodle Integration Notes

Reference: [moodle-essay-drawio](https://github.com/slashdotted/moodle-essay-drawio) — Example embedding draw.io in Moodle quiz.

### How moodle-essay-drawio Works

1. **Moodle Essay Question** — Uses essay question type with response format set to *Plain text, monospaced font*.
2. **Script Injection** — Question text includes a `<script>` tag loading `moodle-essay-drawio.js` and a `<div id="drawio_editor"></div>` container.
3. **Replace Textarea** — Script hides Moodle's `textarea.form-control` and injects an iframe into the container.
4. **draw.io Embed URL** — `https://embed.diagrams.net/?embed=1&ui=minimal&saveAndExit=0&noSaveBtn=1&noExitBtn=1&spin=1&proto=json&modified=0`
5. **postMessage Protocol** — Bidirectional communication:
   - **init**: draw.io sends init; script responds with `{action: 'load', xml: '...', autosave: 1}` (or `{action: 'load', xml: ''}` for empty).
   - **save / autosave**: draw.io sends content; script writes `JSON.stringify(data)` to `moodle_textarea.textContent`.
6. **Persistence** — Moodle saves the textarea value as the student's submission. No server-side integration needed; content is stored in the question response.
7. **Constraints** — One question per page; one question per page when reviewing attempts.

### Adapting for ER Editor

| Aspect | draw.io approach | ER Editor approach |
|--------|------------------|-------------------|
| **Editor source** | External service (embed.diagrams.net) | Self-hosted; bundle built app or serve from CDN |
| **Data format** | JSON (draw.io format) | **XML** (ERDesigner-compatible) or JSON |
| **Container** | Same: div + hide textarea | Same pattern |
| **postMessage** | Full protocol (init, load, save, autosave) | Need equivalent: init → load diagram XML; save/autosave → write XML to textarea |
| **UI** | Minimal (noSaveBtn, noExitBtn) | Exam mode: hide menus, toolbar minimal; `?examMode=true` already exists |

### ER Editor Integration Checklist

1. **Build embeddable bundle** — Produce a standalone build loadable via iframe (e.g. `er-editor.html` or `embed.html`).
2. **postMessage API** — Implement bidirectional protocol:
   - Listen for `init` from parent → respond with `load` + diagram XML (or empty).
   - On diagram save/autosave → `postMessage` to parent with `{event: 'save'|'autosave', xml: '...'}`.
   - Parent script writes `xml` (or a wrapper JSON) to `moodle_textarea.textContent`.
3. **moodle-essay-er-editor.js** — Create a script analogous to moodle-essay-drawio:
   - Find `textarea.form-control`, hide it.
   - Create iframe with `src` pointing to er-editor embed URL.
   - Handle init/load/save via postMessage; persist XML to textarea.
4. **Moodle question setup** — Plain text format; Question text: `<script src="...moodle-essay-er-editor.js"></script><div id="er_editor"></div>`.
5. **Exam mode** — Use `?examMode=true` in embed URL to disable validation toggle, simplify UI.
6. **Review flow** — When grading, load saved XML into read-only or minimal editor for display.

### Considerations

- **CORS** — If er-editor is on a different origin, ensure postMessage `origin` checks are correct.
- **Autosave** — ER editor may need periodic auto-export to XML + postMessage to parent (like draw.io autosave).
- **One question per page** — Same constraint as draw.io to avoid conflicts.

---

## Notes

- Phase 1–3 fixes are code-complete; Phase 4–5 pending.
- Validation overhaul (Phase 4) requires a careful rule-by-rule audit against ER theory.
- Composite attributes (Phase 5) need type, store, canvas, property panel, and serializer changes.
- **Recent fixes (7c, 7d):** Resize/transform live line updates (ref + forceUpdate, preview passed to all shapes); selection clear now removes drag handlers from nodes when unselecting.
