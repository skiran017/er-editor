# Chapter 1 — Introduction

## 1.1 Context

Entity-Relationship (ER) modelling is one of the foundational topics taught in the
database courses at SUPSI (Scuola universitaria professionale della Svizzera italiana).
Students learn to capture the structure of an application domain as a diagram of
*entities*, *relationships*, and *attributes*, following the notation introduced by
Peter Chen in 1976. Chen notation is favoured in teaching because it is explicit: every
modelling concept — weak entities, identifying relationships, cardinality and
participation constraints, key, multivalued, and composite attributes, and
generalisations (IS-A hierarchies) — has a distinct visual symbol, which makes the
underlying theory tangible for students.

To support this teaching, the department uses *ERDesigner*, a desktop application written
in Java. ERDesigner is an established part of the courses: students draw ER diagrams with
it and save them to an XML file that instructors can open and grade. It does its job well,
and the workflow built around it is exactly what this project aims to preserve.

## 1.2 Motivation

ERDesigner works well as a desktop application. Moving the same capabilities into the
browser, however, opens up possibilities the desktop form cannot offer on its own:

- **Zero installation.** A web tool runs in any browser, with nothing to download or keep
  up to date across the many machines and operating systems students use.
- **Touch and mobile.** Running in the browser brings the editor to the tablets and touch
  devices now common in classrooms, in addition to the desktop.
- **Moodle integration.** SUPSI delivers coursework and assessments through Moodle. A web
  editor can be embedded directly in a Moodle activity, so diagram exercises are assigned,
  completed, and collected in the same place as the rest of a course.

The project therefore builds a modern, web-based counterpart to ERDesigner: it covers what
the desktop tool does and adds running anywhere, touch support, and Moodle integration —
while staying fully interoperable with the diagrams instructors already have.

## 1.3 Objectives

The project set out to deliver a browser-based ER diagram editor that offers the
capabilities above while remaining fully compatible with the existing teaching workflow.
The concrete objectives were:

1. **Pure web application.** Run in any modern browser with no installation, as a
   single-page application.
2. **Chen-notation editing.** Provide an intuitive drag-and-drop canvas for creating and
   manipulating entities, relationships, and attributes — including composite attributes
   nested under a parent — as well as generalisations (IS-A hierarchies) in Chen
   notation, with undo/redo, multi-selection, zoom, and pan.
3. **Backward compatibility.** Import and export diagrams in the XML format of the
   existing Java application, with faithful round-trip fidelity so that the two tools can
   coexist.
4. **Diagram validation.** Check diagrams against the rules of Chen notation and surface
   errors to the student, with the ability to disable validation for exam scenarios.
5. **Moodle integration.** Allow instructors to embed the editor inside Moodle
   activities, with automatic saving of the student's work back to the host platform.
6. **Responsive and multilingual.** Adapt to desktop and tablet form factors, support
   touch interaction, and offer an English/Italian interface.
7. **Extensible and maintainable.** Adopt an architecture that keeps the model
   independent of its visual representation, so that additional notations can be added
   later without rewriting the core, and back the implementation with an automated test
   suite.

## 1.4 Scope

The work covers the editing vocabulary of classic ER modelling in Chen notation:
entities (strong and weak), relationships (including identifying, recursive, and N-ary
relationships, and the common 1:1 / 1:N / N:M cardinalities), attributes (key,
discriminant, multivalued, derived, and composite), and generalisations (total and
partial). Round-trip interoperability with the Java application's XML format and
embedding inside Moodle are both in scope.

The following are explicitly **out of scope** for this iteration: a template or example
library, multi-page diagrams, comments, real-time collaboration, and any form of
cloud or server-side persistence. The editor remains a pure client-side application;
persistence is delegated to the host (a downloaded file, or Moodle via `postMessage`).
A second notation (such as Crow's Foot or UML) is not implemented, but the architecture
is designed so that it could be added as a plugin without changing the core.

## 1.5 Document Structure

The remainder of this report is organised as follows:

- **Chapter 2 — Background & Requirements** introduces Chen notation, the existing
  ERDesigner tool and its file format, the Moodle integration need, and the functional
  and non-functional requirements.
- **Chapter 3 — Architecture & Design** describes the layered architecture, the
  technology stack, the notation-plugin system, and the data model.
- **Chapter 4 — Implementation** walks through the main features: the editing canvas,
  the validation engine, the Java XML codec, the Moodle bridge, the responsive interface,
  and the documentation site.
- **Chapter 5 — Testing & Deployment** covers the test-driven development approach, the
  automated test suite, and the public deployment including the Moodle host simulator.
- **Chapter 6 — Conclusions & Future Work** reviews what was achieved, the remaining
  limitations, and possible future directions.
