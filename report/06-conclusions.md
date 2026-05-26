# Chapter 6 — Conclusions & Future Work

## 6.1 Results

The project delivered a working, deployed ER diagram editor that meets the objectives set
out in Chapter 1. Measured against those objectives:

| # | Objective | Outcome |
|---|-----------|---------|
| 1 | Pure web application | A single-page application running in any modern browser with no installation. |
| 2 | Chen-notation editing | Entities, relationships, attributes (key, multivalued, derived, composite), and generalisations, with undo/redo, multi-selection, zoom, and pan. |
| 3 | Backward compatibility | Round-trip Open/Save in the ERDesigner XML format, verified against real SUPSI sample files. |
| 4 | Diagram validation | More than thirty Chen-notation rules, surfaced on the canvas and in the panel, and toggleable for exams. |
| 5 | Moodle integration | An embeddable mode with debounced autosave over `postMessage`, plus a host simulator for testing. |
| 6 | Responsive & multilingual | Desktop, tablet, and mobile layouts with touch support, and an English/Italian interface. |
| 7 | Extensible & maintainable | A layered architecture with a notation-plugin boundary, backed by roughly 950 automated tests. |

Beyond the editor itself, the project produced a documentation site serving both users
and developers, and a combined deployment that ships the editor, the documentation, and
the Moodle simulator from a single build. The result is a tool ready for use in teaching:
it brings ER modelling to the browser, to touch devices, and into Moodle, while remaining
fully interoperable with the diagrams instructors already use.

## 6.2 Limitations

Several boundaries are worth stating honestly:

- **One notation in practice.** The architecture is designed so that a second notation can
  be added as a plugin, and Chen notation is implemented entirely through that boundary.
  However, only Chen is implemented, so the extensibility of the seam has not yet been
  proven by a second, independent notation.
- **Light end-to-end coverage.** Unit and integration coverage is extensive, but automated
  browser-level (end-to-end) testing currently amounts to a single smoke test. Much of the
  interaction behaviour is exercised through the interaction machine in isolation rather
  than through a real browser.
- **Deliberately excluded features.** Real-time collaboration, multi-page diagrams, a
  template/example library, comments, and any cloud or server-side persistence were out of
  scope by design. Persistence is delegated to the host — a downloaded file, or Moodle.
- **Single interchange format.** The only fully round-trippable format is the ERDesigner
  XML; Mermaid, PNG, and SVG are export-only.

## 6.3 Future Work

The most natural extensions follow directly from the design:

- **A second notation.** Implementing Crow's Foot or UML notation as a plugin would both
  add a frequently requested capability and validate the extensibility claim of the
  architecture.
- **Broader end-to-end testing.** Expanding the Playwright suite — and adding visual
  regression tests for the glyphs — would protect the interaction and rendering layers as
  directly as the round-trip tests protect the file format.
- **Auto-layout.** Automatic arrangement of entities and relationships would help students
  tidy diagrams and ease the import of large legacy files.
- **Accessibility audit.** A formal pass on keyboard navigation, focus order, and screen-
  reader labelling would broaden the tool's reach.
- **Selective reintroduction of deferred features.** Should teaching needs demand it, the
  excluded features — for example a small library of example schemas — could be added
  incrementally on top of the existing architecture.

## 6.4 Closing

The project set out to bring the capabilities of the established ERDesigner tool to the
browser — a modern, web-based, Moodle-ready ER editor that stays compatible with the
existing teaching workflow. The editor is deployed, interoperable, validated by an
extensive test suite, and documented for both its users and its future maintainers. Its
layered, plugin-oriented architecture leaves it well positioned to grow — toward new
notations, richer testing, and whatever the courses at SUPSI require next.
