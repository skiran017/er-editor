# Chapter 3 — Architecture & Design

## 3.1 Design Principles

A diagram editor mixes three concerns that are easy to entangle: the model of *what a
diagram is*, *how it is drawn*, and *how the user interacts with it*. Letting these bleed
together produces large, hard-to-test files and makes new features expensive. The
architecture is therefore organised around three principles:

- **Layered separation.** The application is split into layers with a strict, one-way
  dependency direction. The model of *what a diagram is* knows nothing about *how it is
  drawn* or *how the user interacts with it*.
- **Notation as a plugin.** Everything specific to Chen notation — the glyphs, the
  validation rules, the import/export formats — lives behind a single plugin interface,
  so the core never hard-codes notation details.
- **Small, single-responsibility modules.** Files are kept small (a soft target of
  around 200 lines), one component per file, with layer-boundary imports enforced by
  linting. This keeps each unit understandable and testable in isolation.

## 3.2 Technology Stack

| Concern | Technology | Role |
|---------|-----------|------|
| UI framework | **React 19** + **TypeScript** | Component composition and type-safe model. |
| Build tooling | **Vite 7** | Fast dev server and optimised production bundle. |
| Diagram canvas | **React Flow (xyflow) 12** | Controlled node/edge rendering, pan/zoom, selection, with custom components per notation. |
| State management | **Zustand 5** | Small, sliced stores for diagram, viewport, selection, UI, and validation state. |
| Undo / redo | **zundo** | Temporal middleware wrapping the diagram store to give a history stack. |
| Interaction logic | **XState 5** | A finite-state machine governing drawing, placing, and connecting modes. |
| Styling | **Tailwind CSS 4** | Utility-first responsive styling and theming. |
| Internationalisation | **i18next** | English/Italian interface strings. |
| Testing | **Vitest** + **Playwright** | Unit/integration tests and end-to-end browser tests. |

The whole application is a client-side single-page application; there is no server
component.

## 3.3 Layered Architecture

The source is organised into layers, each a top-level folder under `src/`, with
dependencies pointing only "downward" toward the model:

```
ui          → React components: toolbar, property panel, menus, modals
canvas      → React Flow integration and notation-adapter rendering
interaction → the XState finite-state machine (drawing, placing, connecting)
state       → Zustand stores (diagram, viewport, selection, validation, ui)
notation    → the notation-plugin contract and the Chen implementation
domain      → pure model: types, geometry, graph helpers, invariants
```

Supporting these are `platform` (browser concerns: file access, i18n bootstrap) and
`app` (composition root, URL-flag handling, and the Moodle bridge). The lowest layer,
**domain**, is pure TypeScript with no framework dependencies: it defines what a diagram
is and the operations on it. Each layer above adds one concern — state holding, then
interaction, then rendering, then user-interface chrome — and may depend only on the
layers below it. A lint rule rejects imports that cross these boundaries the wrong way,
so the separation cannot quietly erode over time.

> **[FIGURE: architecture.png | The layered architecture — dependencies point downward;
> the notation-plugin boundary is highlighted.]**

## 3.4 Data Model

A diagram is held as a single normalised, indexed structure rather than as nested object
trees:

```typescript
interface Diagram {
  schemaVersion: 1
  nodesById: Record<NodeId, ERNode>
  edgesById: Record<EdgeId, ERLink>
  nodeOrder: NodeId[]
  edgeOrder: EdgeId[]
}
```

Several deliberate choices follow from this:

- **Indexed by id.** Looking up or updating an element is a direct key access, and the
  `*Order` arrays preserve draw order. This scales better than searching nested arrays
  as diagrams grow.
- **Discriminated unions.** A node is one of `EntityNode`, `RelationshipNode`,
  `AttributeNode`, or `ISANode`, distinguished by a `kind` field; edges are likewise an
  `EntityRelationshipEdge`, `AttributeEdge`, or `ISAEdge`. TypeScript then forces every
  piece of code that handles a node to account for each kind, which removes a large class
  of bugs at compile time.
- **Branded identifiers.** `NodeId` and `EdgeId` are branded string types that can only
  be produced through a dedicated factory, so an entity id can never be accidentally used
  where an edge id is expected.
- **Coordinate system.** Internally the editor uses top-left world coordinates, native to
  React Flow. The conversion to and from the Java application's centre-based coordinates
  is confined entirely to the Java XML codec (§4.3), so the rest of the system never has
  to reason about two coordinate conventions.

## 3.5 State Management

Application state is divided into several small Zustand stores, each owning one concern:

- **diagramStore** — the `Diagram` itself; the single source of truth for content.
- **viewportStore** — zoom level and pan offset.
- **selectionStore** — which nodes and edges are currently selected.
- **validationStore** — the current set of validation errors and whether validation is enabled.
- **uiStore** — interface state: open panels, modals, language, and the embed/readonly/exam flags.
- **interactionStore** — hosts the interaction state machine described next.

Splitting state this way means a component re-renders only when the slice it actually
reads changes — for example, moving the viewport does not re-render the property panel.
The diagram store is wrapped with the **zundo** temporal middleware, which records past
and future states and so provides undo/redo essentially for free, scoped precisely to
diagram content (and not, say, to which panel is open).

## 3.6 Interaction Model

User interaction with the canvas — picking a tool, placing a new element, dragging out a
relationship, connecting two shapes — is inherently *modal*: the meaning of a click
depends on what the user is currently doing. Rather than scatter this logic across
event handlers with ad-hoc boolean flags, it is modelled explicitly as a **finite-state
machine** using XState.

The machine has a small set of states — *selecting* (the default), *panning*,
*placing* (a tool is armed and the next canvas click drops an element), *drawing*, and
*quickRelationship* (dragging from one entity to another to create a relationship) —
with well-defined transitions between them. Global events such as undo, redo, delete,
duplicate, and rename are handled uniformly at the top level. Because the machine is a
plain, framework-agnostic object, the interaction logic can be tested directly by
sending it event sequences and asserting on the resulting state, with no DOM involved.

## 3.7 Notation Plugin System

The notation boundary is the architectural feature that keeps the tool extensible. A
notation is described by a single `NotationPlugin` interface that bundles everything
notation-specific:

```typescript
interface NotationPlugin {
  id: string
  label: string
  nodeTypes: Record<NodeKind, ComponentType<NodeProps>>   // glyph components
  edgeTypes: Record<EdgeKind, ComponentType<EdgeProps>>   // connector components
  tools: ToolbarConfig                                     // which tools appear
  defaults: NotationDefaults                               // default sizes, edge style
  validate: (d: Diagram) => Record<string, ValidationError[]>
  codecs: { nativeJson: Codec; javaXml?: Codec; mermaid?: Codec; png?: Codec; svg?: Codec }
}
```

Chen notation is supplied as one implementation of this interface: it provides the
rectangle/diamond/ellipse/triangle glyph components, the cardinality and participation
rendering, its validation rule set (§4.2), and its codecs (§4.3). The core canvas and UI
consume only the interface — they ask the active plugin for the component that draws a
given node kind, or for the rules to validate against — and never reference Chen
specifically. Adding a second notation such as Crow's Foot would mean writing a new
plugin object; the core model, stores, and interaction machine would not change. This
directly satisfies the extensibility requirement (N3) set out in the previous chapter.
