# Testing

The project has ~1000 tests across three layers. They run via `pnpm test --run`. CI requires all of them green.

## Three layers

| Layer | Files | What it tests |
|---|---|---|
| **Unit** | `src/**/*.test.{ts,tsx}` — colocated with the unit | Pure logic. Domain helpers, codec parsers, FSM transitions, validation rules, store mutations. Most of the suite. |
| **Integration** | `src/ui/integration.test.tsx`, `src/canvas/**/*.test.tsx` | Multiple units composed: render `<App />` with state setup, dispatch synthetic events, assert observable side effects. |
| **End-to-end** | `tests/e2e/**` (Playwright) | Whole-app flows in a real browser. Slower; CI runs them separately. Out of scope for this iteration. |

## Coverage thresholds

Per-package thresholds in `vitest.config.ts`:

```typescript
thresholds: {
  'src/domain/**':           { 95, 90, 95, 95 },
  'src/notation/chen/codecs/**': { 90, 85, 90, 90 },
  'src/notation/chen/rules/**':  { 90, 85, 90, 90 },
  'src/interaction/**':      { 90, 85, 90, 90 },
  'src/canvas/hooks/**':     { 85, 80, 85, 85 },
  /* ... */
}
```

(Order: statements, branches, functions, lines.) Add new files to existing buckets where they fit; only add a new bucket if the file has fundamentally different test characteristics.

## When to use which layer

- **Unit:** anything that fits in a single file's responsibility — pure logic, store actions, single hook behavior.
- **Integration:** when behavior spans more than one file — e.g. "clicking the toolbar's Entity button → FSM goes to placing.entity → canvas click → diagram store gains an entity." Three layers, one test.
- **E2E:** whole-app flows worth a real browser — drag-and-drop from toolbar, file save/open dialogs, embed-mode iframe rendering.

## Test patterns

- **No mocks for our own code.** If a test of the toolbar needs the FSM to be in a specific state, send the events to set up that state. Don't mock `useInteractionStore`.
- **Mock at boundaries.** External I/O (clipboard, file system, postMessage to a real parent) is mocked. The Moodle bridge tests mock `window.parent.postMessage` and fire synthetic `MessageEvent`s.
- **Fake timers when timing matters.** `vi.useFakeTimers()` + `vi.advanceTimersByTime(N)` for debounce / timeout / animation tests.
- **Reset stores in `beforeEach`.** Pattern: `useDiagramStore.setState({ diagram: emptyDiagram() }); useDiagramStore.temporal.getState().clear()`.

## Common gotchas

- **jsdom has no `matchMedia`.** Hooks like `usePanelMode` return `'mobile'` by default in tests. Mock if the test depends on a different breakpoint: `vi.mock('@/ui/app/usePanelMode', () => ({ usePanelMode: vi.fn(() => 'desktop' as const) }))`.
- **React StrictMode double-mount in tests.** `<StrictMode>` is in `main.tsx`, not the test render. So tests render once; production renders twice in dev mode. Effects that aren't idempotent fail in production but pass in tests.
- **Persisted Zustand state leaks across tests** if `useUiStore` is hit. Reset relevant fields in `beforeEach` (the persist key is `er-editor:ui`).

## Where to next

- [API Reference](../../api/) — every public module is also documented from source.
- [Build & deploy](./build-deploy).
