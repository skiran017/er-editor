# Moodle integration reference

Implementer view of the postMessage host bridge. User-facing setup is at [Embedding in Moodle](../../user/moodle).

## File layout

- `src/app/moodleBridge.ts` — the bridge module. Exports `installMoodleBridge(): () => void` and types `EditorOutgoing`, `EditorIncoming`.
- `src/app/moodleBridge.test.ts` — full test suite.
- `src/main.tsx` — calls `installMoodleBridge()` once at boot, after the URL-apply pipeline.

## Activation

The bridge no-ops unless **both** of these are true:
- `?embed=true` URL flag.
- `window.parent !== window` (the page is iframed).

When inactive, no listeners are installed — zero overhead.

## Origin resolution

Resolved once at init, cached for the session:

1. `?parentOrigin=<origin>` URL param if present and parses as a valid `URL`.
2. Otherwise `new URL(document.referrer).origin` if the referrer is non-empty and parseable.
3. Otherwise `"*"` (wildcard).

When the resolved origin is `"*"`, the bridge logs a warning so unlocked deploys are visible in DevTools:

```
[er-editor] postMessage running with origin=*; pass ?parentOrigin=... to lock down
```

For incoming messages: if `targetOrigin` is exact, `event.origin` must match exactly; otherwise (wildcard) any origin is accepted.

## Message schemas

```typescript
export type EditorOutgoing =
  | { source: 'er-editor'; type: 'ready' }
  | { source: 'er-editor'; type: 'save'; xml: string }
  | { source: 'er-editor'; type: 'autosave'; xml: string }
  | { source: 'er-editor'; type: 'error'; message: string }

export type EditorIncoming =
  | { source: 'moodle-er-host'; type: 'init' | 'load'; xml: string }
```

Both types are exported from `src/app/moodleBridge.ts` so host implementers can `import type` them.

Messages with unknown `source`, `type`, or shape are silently ignored — invalid hosts have no effect.

## Outgoing flow

| Event | Trigger |
|---|---|
| `ready` | Once, immediately after the bridge installs listeners. |
| `autosave` | 800ms after the latest `useDiagramStore.diagram` change (debounced). Multiple changes within the window coalesce into one autosave. |
| `save` | On `pagehide` and `beforeunload`. Final flush. Cancels any pending autosave. |
| `error` | Wrap around `chenJavaXmlCodec.serialize` and `chenJavaXmlCodec.parse`. The error message is the codec's; stack traces are never sent. |

Subscription is via `useDiagramStore.subscribe((s) => s.diagram, ...)` — only diagram changes trigger autosave (selection, viewport, ui changes are ignored).

## Incoming flow

| Event | Action |
|---|---|
| `init` / `load` with non-empty XML | `chenJavaXmlCodec.parse(xml)` → `useDiagramStore.replaceDiagram(parsed)`. |
| `init` / `load` with empty / whitespace XML | `useDiagramStore.replaceDiagram(emptyDiagram())`. |
| `init` / `load` with malformed XML | Outgoing `error` event with the parser's message; store unchanged. |

## Cleanup

`installMoodleBridge` returns a cleanup function. Calling it:
- Removes all event listeners (`message`, `pagehide`, `beforeunload`).
- Cancels any pending autosave timer.
- Unsubscribes from `useDiagramStore`.

Today only the test suite calls cleanup. The browser-side bridge runs for the page lifetime; HMR re-runs `main.tsx` cleanly.

## Test strategy

Six describe blocks in `src/app/moodleBridge.test.ts`:
1. **Activation gate** — embed=false / no-parent → no listeners.
2. **Origin resolution** — table-driven (parentOrigin × referrer → targetOrigin).
3. **Outgoing autosave** — store mutations + fake timers → debounced postMessage.
4. **Outgoing save flush** — `pagehide` event → `save` message + cancelled autosave.
5. **Incoming init/load** — synthetic `MessageEvent` → diagram replaced.
6. **Cleanup** — cleanup → no further outgoing messages.

## What's preserved from legacy

The bridge is a port of `src/legacy/App.tsx` lines 34-149. Activation gate, origin resolution algorithm, message names, and 800ms debounce are 1:1.

## What's refined

| Legacy | v2 | Reason |
|---|---|---|
| Wildcard `*` falls through silently | Logs `console.warn` | Surfaces unlocked deploys |
| Subscribes to whole `editorStore` | Subscribes via diagram-selector only | Selection / viewport / ui changes shouldn't trigger autosave |
| Inline serializer call | Uses `chenJavaXmlCodec` | Codec is the v2 public XML surface |
| Untyped event payloads | Discriminated unions exported as types | Host implementers can `import type` them |

## Where to next

- [User docs: Embedding in Moodle](../../user/moodle) — host-side guide with full HTML+JS sample.
- [URL parameters reference](./url-parameters).
