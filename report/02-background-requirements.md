# Chapter 2 — Background & Requirements

## 2.1 Chen Notation

The Entity-Relationship model, introduced by Peter Chen in 1976, describes the
structure of a domain using three primitives, each drawn with a distinct shape:

- **Entities** — the "things" of the domain (e.g. *Student*, *Course*), drawn as
  rectangles. A **weak entity**, which cannot be identified without another entity, is
  drawn with a double rectangle.
- **Relationships** — associations between entities (e.g. *enrols-in*), drawn as
  diamonds. A relationship is annotated with **cardinality** (1, N, M) and
  **participation** (partial or total) constraints on each connected entity. An
  **identifying relationship**, used to identify a weak entity, is drawn with a double
  diamond.
- **Attributes** — properties of entities or relationships (e.g. *name*, *date*), drawn
  as ellipses connected by a line. Attributes carry sub-types: a **key** attribute
  (underlined) identifies the entity; a **multivalued** attribute (double ellipse) can
  hold several values; a **derived** attribute (dashed ellipse) is computed from others;
  and a **composite** attribute groups child attributes beneath it.

In addition, **generalisation** (an IS-A hierarchy) expresses that several specialised
entities are kinds of a more general one, drawn with a triangle and labelled total or
partial. This explicit, symbol-rich vocabulary is precisely what makes Chen notation
valuable for teaching, and reproducing it faithfully was a central requirement of the
project.

> **[FIGURE: chen-legend.png | Chen notation element legend — the symbols the editor
> draws for entities, relationships, attribute variants, and generalisation.]**

## 2.2 The Existing Tool and its XML Format

The department's existing tool, ERDesigner, is a Java desktop application that stores
each diagram as an XML document. Two characteristics of this format shaped the project:

- **Center-based coordinates.** The Java application records the position of each shape
  by its centre point, whereas web rendering libraries conventionally use the top-left
  corner. Any interoperable web tool must convert between the two coordinate systems on
  load and save.
- **A specific element vocabulary.** The format encodes entities, relationships,
  attributes, and their Chen-notation sub-types (weak, identifying, key, multivalued,
  and so on) with particular element names and attributes.

Because instructors have an existing body of diagrams and an established grading
workflow built around this format, **round-trip fidelity** — loading a file produced by
the Java application, editing it, and saving it back so that the Java application can
reopen it without loss — was treated as a hard acceptance criterion rather than a
nice-to-have. The two tools must be able to coexist during any transition period.

## 2.3 Moodle and the Integration Need

Moodle is the open-source learning-management platform through which SUPSI delivers
course materials and assessments. The pedagogical goal behind this project is for a
student to complete a diagram exercise *inside* a Moodle activity — the same place they
read the assignment and submit other work — rather than in a separate desktop
application whose output must be uploaded by hand.

Technically, an embedded web tool runs inside an `<iframe>` on the Moodle page, and the
two communicate through the browser's `postMessage` API, which allows scripts on
different origins to exchange messages safely. This imposes several requirements on the
editor:

- It must detect when it is running embedded and adapt its interface accordingly
  (the host owns saving, so the editor's own file menu is hidden).
- It must report the student's work back to the host automatically, so that progress is
  captured without the student remembering to "submit".
- It must support an **examination mode** in which validation feedback is suppressed, so
  that the tool does not coach students during a graded assessment.

These behaviours are driven by URL flags the host sets on the iframe (for example
`embed`, `readonly`, `validation`, `examMode`, and `lang`), keeping the integration
declarative and easy for an instructor to configure.

## 2.4 Functional Requirements

The functional requirements, derived from the project brief, are summarised below.

| # | Requirement | Description |
|---|-------------|-------------|
| F1 | Canvas editing | Create, move, resize, and connect entities, relationships, attributes, and generalisations on a zoomable, pannable canvas. |
| F2 | Chen sub-types | Support weak entities, identifying/recursive/N-ary relationships, cardinality and participation, and key/multivalued/derived/composite attributes. |
| F3 | Selection & batch ops | Single and marquee multi-selection, with move, copy/paste, and delete applied to the selection. |
| F4 | Undo / redo | A full, reversible edit history. |
| F5 | Validation | Check diagrams against Chen-notation rules and flag errors on the offending elements; the engine can be toggled off. |
| F6 | Import / export | Load and save diagrams in the Java application's XML format with round-trip fidelity; additionally export a textual (Mermaid) representation. |
| F7 | Moodle integration | Run embedded in an iframe, hide host-owned controls, auto-save via `postMessage`, and honour exam/read-only modes. |
| F8 | Localisation | Switch the interface between English and Italian. |
| F9 | Responsive & touch | Adapt the layout to desktop and tablet, and support touch gestures for creation, selection, and movement. |

## 2.5 Non-Functional Requirements

| # | Requirement | Target |
|---|-------------|--------|
| N1 | Zero installation | Runs in any modern browser as a single-page application; no plugins or runtime to install. |
| N2 | Interaction performance | Smooth (≈60 fps) drag, pan, and zoom on diagrams of typical teaching size. |
| N3 | Extensibility | Architecture allows a second notation (e.g. Crow's Foot, UML) to be added as a plugin without modifying the core model. |
| N4 | Maintainability | Small, single-responsibility modules with enforced layer boundaries, so the system stays easy to navigate, test, and extend. |
| N5 | Reliability | Backed by an automated test suite, with the Java XML round-trip as a hard regression gate. |
| N6 | Accessibility | Keyboard-operable tools and shortcuts; readable contrast in light and dark themes. |

Together these requirements frame the design decisions described in the next chapter:
a layered architecture that isolates the model from its rendering, a plugin boundary for
the notation, and a test strategy that protects the compatibility guarantees.
