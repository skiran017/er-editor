# Chapter 4 — Implementation

This chapter describes how the main features were built on top of the architecture of
Chapter 3. It follows the path of a diagram through the system: drawing it on the canvas,
validating it, saving and exporting it, and — when embedded — exchanging it with Moodle.
It closes with the responsive interface and the project's documentation site.

## 4.1 The Editing Canvas and Chen Tools

The canvas is built on React Flow, which provides pan, zoom, selection, and node/edge
rendering, while the Chen-specific glyphs are supplied by the notation plugin. The
toolbar exposes the modelling vocabulary in three groups:

- **Selection** — *select* and *pan*.
- **Elements** — *entity*, *relationship*, and *attribute*, placed by dragging onto the
  canvas or by arming the tool and clicking.
- **Connections** — a plain *connect* tool plus *quick* flows that create a relationship
  with a preset cardinality in one gesture (1:1, 1:N, N:M) and two generalisation flows
  (partial and total IS-A).

A deliberate design detail concerns generalisations: a lone IS-A node has no meaning in
Chen notation, since it must join a parent to one or more children. The toolbar therefore
does not offer a standalone "ISA" element; instead the two quick-generalisation flows
create the triangle together with its connections in a single action. Each created
element is editable through a property panel that adapts to the selected kind — toggling
an entity's *weak* flag, an attribute's *key*/*multivalued*/*derived*/*composite* flags,
or a relationship participant's cardinality and participation.

All structural edits go through the diagram store, which is wrapped with undo/redo
history, so every action — create, move, rename, delete, or a multi-element batch
operation — is individually reversible.

## 4.2 Validation Engine

The validation engine checks a diagram against the rules of Chen notation and reports
problems on the offending element. Rules are small, independent functions, each taking
the whole diagram and returning the elements that violate it, grouped into five
categories:

| Category | Examples |
|----------|----------|
| Entity | A strong entity must have a key; a weak entity must have a discriminant. |
| Relationship | Cardinality/participation must be specified; identifying relationships must connect a weak entity. |
| Attribute | A key and a discriminant are mutually exclusive; names must be present. |
| Generalisation | An IS-A must have a parent and at least one child. |
| Structural | Names must be unique where the notation requires it. |

In total the engine ships **more than thirty rules**. Crucially, rules encode the
*semantics* of the notation, not just surface checks: for instance, the "entity must have
a key" and "entity must have an attribute" rules deliberately exempt IS-A children,
because a subclass inherits its identifier from its parent — flagging it would teach the
student the wrong thing.

Errors surface in two places: a small marker on the element in the canvas, and a list in
the property panel describing each problem. The whole engine can be switched off through
configuration, which is the mechanism behind the examination mode discussed in §4.4.

## 4.3 File Format and Codecs

Persistence and interchange are handled by *codecs* — modules that translate between the
internal diagram model and an external text format. The notation plugin can carry several;
the Chen plugin provides four paths exposed through the application menu:

- **Java XML (Open / Save)** — the primary format, fully round-trippable with the
  ERDesigner desktop application. This codec is where the coordinate-system conversion
  lives: ERDesigner stores shape positions by their centre point, so on *load* the codec
  converts centre coordinates to the top-left convention the editor uses internally, and
  on *save* it converts back. Round-trip fidelity — open a file produced by the desktop
  tool, edit it, save it, and have the desktop tool reopen it without loss — is verified
  by automated tests against real SUPSI sample files (§5).
- **Mermaid (Export)** — a textual representation of the diagram, useful for embedding in
  documentation or Markdown-based materials.
- **PNG and SVG (Export)** — raster and vector images of the canvas, for inclusion in
  reports or submissions.

Because each format is an independent codec behind a common interface, adding or changing
a format does not touch the editing or rendering code.

## 4.4 Moodle Integration

The Moodle integration lets a student work on a diagram inside a Moodle activity, with
their work captured automatically by the host page. It is implemented as a small *bridge*
that mediates between the editor and the surrounding page through the `postMessage` API.

**Activation.** The bridge only activates when the editor is genuinely embedded — that is,
when it is launched with the `embed` flag *and* is actually running inside a parent frame.
Run directly, the editor behaves as a normal standalone application and the bridge stays
dormant.

**Message protocol.** Communication is a small set of typed messages, each tagged with a
`source` field so the two sides can ignore unrelated traffic on the page:

| Direction | Message | Meaning |
|-----------|---------|---------|
| Editor → host | `ready` | The editor has loaded and is ready to receive a diagram. |
| Host → editor | `init` / `load` | Load this XML diagram into the editor. |
| Editor → host | `autosave` | The diagram changed; here is its current XML (debounced). |
| Editor → host | `save` | A final snapshot, sent when the page is about to unload. |
| Editor → host | `error` | Parsing or serialisation failed; here is the reason. |

**Automatic saving.** Rather than send a message on every keystroke, autosave is
*debounced*: after a change, the bridge waits 800 ms for activity to settle before
serialising the diagram and posting it to the host. This coalesces a burst of edits into a
single message. To avoid losing the last edits, a final `save` is flushed when the page is
hidden or unloaded.

**Security.** Cross-origin messaging must be told which origin to trust. The bridge
resolves the target origin in order of preference: an explicit `parentOrigin` URL
parameter set by the host, then the document referrer, falling back to a wildcard only as
a last resort (and logging a warning when it does). Incoming messages whose origin does
not match are ignored.

**Exam mode.** When the host requests examination mode, validation feedback is suppressed
and the file controls are hidden, so the tool records the student's work without coaching
them during a graded assessment. All of these behaviours — embed, read-only, validation
on/off, exam mode, and interface language — are driven declaratively by URL flags the host
sets on the iframe, so an instructor configures the integration without writing code.

> **[FIGURE: moodle-flow.png | The Moodle ⇆ editor postMessage exchange: ready →
> init/load → debounced autosave → final save on unload.]**

## 4.5 Responsive and Touch Interface

The interface adapts to three layout modes — *desktop*, *tablet*, and *mobile* — detected
from the viewport using media queries. The property panel renders inline beside the canvas
on desktop, and as a slide-over drawer on smaller screens. The toolbar becomes a vertical
rail that can be collapsed to a single button on phones, so it never covers the limited
canvas area; picking a tool auto-collapses it. Touch gestures drive creation, selection,
and movement, so the editor is usable on the tablets common in classrooms, extending ER
modelling to devices beyond the desktop.

## 4.6 Documentation Site

Alongside the application, the project ships a documentation site built with VitePress.
It serves two audiences from one source: a high-level **user guide** (tools, keyboard
shortcuts, file handling, and how to embed the editor in Moodle) and a detailed
**developer guide** (architecture, the domain model, the interaction machine, the notation
plugin contract, and recipes for extending the tool). Selected pages embed code directly
from the source via region markers, and an API reference is generated automatically from
the TypeScript types, so the documentation stays in step with the code rather than drifting
from it. The site is deployed together with the application (§5.3).
