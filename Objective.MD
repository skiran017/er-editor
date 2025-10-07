# ER Editor - SUPSI

## Project Overview
A web-based Entity-Relationship (ER) Diagram Editor inspired by **ERDesigner**, designed for educational use at SUPSI.  
The editor allows students and instructors to **create, edit, and visualize ER diagrams** using **Chen notation**, with future extensibility for other notations and formats.

The project’s goal is to provide an intuitive, responsive, and multilingual browser-based tool that can also be embedded inside **Moodle** for assignments and assessments.

---

## Core Objectives
- Develop a **pure web application** (browser-only) — no installation required.
- Provide a **drag-and-drop editor** for creating and manipulating ER diagrams.
- Support **Chen notation** initially, with an architecture extensible to other notations.
- Enable **import/export** of diagrams in **ERDesigner-compatible XML** format.
- Ensure **responsive design**, **touchscreen support**, and **localization (English → Italian)**.
- Allow professors to embed the editor in **Moodle** with configurable validation modes.

---

## Functional Features (MVP)
| Priority | Feature | Description |
|-----------|----------|-------------|
| 🥇 **High** | **Canvas Editing (Core)** | Create, move, and connect entities, attributes, and relationships on a zoomable canvas. |
|  | **Drag-Select / Multi-Select** | Select multiple elements via marquee drag and perform batch operations (move, copy, delete). |
|  | **Undo / Redo** | Full edit history for reversible actions. |
|  | **Cut / Copy / Paste** | Duplicate or move diagram elements while maintaining relationships. |
|  | **Zoom / Pan Canvas** | Mouse wheel or touch gestures to zoom in/out and pan across the workspace. |
|  | **Validation Engine (Toggleable)** | Contextual diagram validation (on/off via configuration, e.g. Moodle exam mode). |
|  | **XML Import / Export** | Load and save ER diagrams in ERDesigner-compatible XML format. |
|  | **Localization (EN → IT)** | Interface language switch between English and Italian. |
|  | **Responsive Design** | Adaptive layout for desktop and tablet devices. |
|  | **Touchscreen Support** | Gesture-based creation, selection, and movement on touch devices. |

---

## Good-to-Have Enhancements
| Priority | Feature | Description |
|-----------|----------|-------------|
| 🥈 **Medium** | **Export as Image (PNG / JPEG)** | Export the diagram canvas as a raster image for reports or submissions. |
|  | **SVG Export** | Scalable vector export for printing or publication. |
|  | **Alternate Notations** | Support additional ER notations (Crow’s Foot, UML). |
|  | **Mermaid / Markdown Export** | Generate textual representation for integration in documentation or Moodle quizzes. |
|  | **Auto-Layout** | Smart organization of entities and relationships. |
|  | **Dark Mode / Themes** | User preference for light/dark color schemes. |
|  | **Keyboard Shortcuts** | Quick access to common actions (Ctrl+Z, Ctrl+C, etc.). |

---

## Technical Overview
- **Platform:** Pure browser (SPA – Single Page Application)
- **Rendering:** SVG-based interactive canvas
- **Language:** JavaScript / TypeScript (TBD)
- **Architecture:** Modular, notation-agnostic graph model with import/export codecs
- **Persistence:** Local XML file I/O
- **Integration:** Embeddable via `<iframe>` inside Moodle; communicates using `postMessage` API
- **Configuration Parameters:**  
  - `?validation=on|off` — enable/disable validation  
  - `?lang=en|it` — select language  
  - `?readonly=true|false` — control edit mode  

---

## Validation Rules (Chen Notation – Initial Set)
- Every **entity** must have at least one **key attribute**.
- **Attributes** connect to exactly one entity.
- **Relationships** must connect at least two entities.
- Cardinality and participation must be defined for all relationship ends.

Validation can be **toggled off** for Moodle embedding (e.g., during exams).

---

## Internationalization (i18n)
- Default language: **English**
- Future language: **Italian**
- All UI strings stored in JSON bundles (e.g., `/locales/en.json`, `/locales/it.json`)

---

