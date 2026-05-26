# Chapter 5 — Testing & Deployment

Reliability was a stated non-functional requirement (N5), and for a tool that must
interoperate with an existing application it is not optional: a diagram that fails to
round-trip is a corrupted piece of a student's work. This chapter describes the testing
approach that protects those guarantees and the deployment that delivers the tool.

## 5.1 Test-Driven Development

Features were built test-first: a failing test was written to capture the intended
behaviour, the minimal code to satisfy it followed, and the design was refined once the
test passed. This discipline was practical here precisely because of the architectural
choices in Chapter 3. The pure domain layer, the framework-agnostic interaction machine,
and the rule functions are all plain inputs-to-outputs code with no DOM or network
dependencies, so they can be tested directly and quickly. Writing the test first also
forced each unit to have a usable interface before its internals existed, which kept the
modules small and focused.

## 5.2 The Test Suite

The suite uses **Vitest** for unit and integration tests and **Playwright** for
end-to-end browser tests. In total there are roughly **950 tests across about 130 test
files**, distributed across every layer of the architecture rather than concentrated in
one place:

- **Domain** — geometry, graph helpers, and model invariants.
- **Notation** — each Chen validation rule, and the codecs (read, write, transform, and
  round-trip).
- **State & interaction** — store reducers, selectors, and the interaction machine driven
  by event sequences.
- **UI** — components and overlays (the property panel, toolbar, menus, inline rename)
  rendered and asserted with the React Testing Library.

Time-dependent behaviour is tested deterministically with simulated timers — the 800 ms
autosave debounce of §4.4, for example, is verified by advancing virtual time rather than
waiting in real time. End-to-end coverage is provided by a Playwright smoke test that
drives a real browser to confirm the application boots and the core flow works.

## 5.3 The Round-Trip Compatibility Gate

The single most important guarantee is interoperability with the ERDesigner XML format,
so it has dedicated, layered tests. The Java XML codec is tested at the level of reading,
writing, and coordinate transformation individually, and then end-to-end: real SUPSI
sample files (for example a conference-schema diagram) are loaded, re-serialised, and
checked to ensure the output is faithful to the input. Because the centre-versus-top-left
coordinate conversion (§4.3) is a common source of drift, these round-trip tests act as a
regression gate — a change that subtly shifts a coordinate or drops an attribute fails the
build rather than silently corrupting files.

## 5.4 Continuous Integration

Every change runs through an automated pipeline before it can be merged. The main workflow
performs, in order:

1. **Lint** — code style and the layer-boundary import rules.
2. **Locale lint** — a check that the English and Italian translation bundles are complete
   and consistent.
3. **Type check** — the full TypeScript compilation.
4. **Unit & integration tests** — the Vitest suite.
5. **Build** — a complete production build, which must succeed.

A separate workflow runs the Playwright end-to-end test in a real browser. Because the
build step is part of the gate, a broken build — including a broken documentation build —
cannot reach the deployed site.

## 5.5 Deployment

The application is deployed on **Vercel** as static assets, with no server runtime. A
single build command produces one `dist/` directory that contains everything served:

- the **editor** at the site root (`/`);
- the **documentation site** under `/docs/`;
- the **Moodle host simulator** at `/moodle`.

The build compiles the application, builds the documentation site, and copies the
documentation output into the editor's `dist/docs` folder, so the two ship together from a
single deployment. Routing is configured so that clean URLs work and any unknown path
falls back to the single-page application, while the documentation, the simulator, and
static assets are served directly.

The Moodle host simulator deserves a note: it is a small page that embeds the editor in an
iframe exactly as a real Moodle activity would, and displays the `postMessage` traffic
live. It made the integration of §4.4 testable during development without a running Moodle
instance, and it doubles as runnable documentation of the host side of the protocol.

> **[FIGURE: deployment.png | Deployment topology — one build produces a single `dist/`
> served at three paths: `/` (editor), `/docs/` (documentation), `/moodle` (simulator).]**
