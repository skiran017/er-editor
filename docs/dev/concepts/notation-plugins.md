# Notation plugins

A notation plugin bundles everything needed to render and validate a single notation: tools, node renderers, edge renderers, validation rules, and codecs. Today only Chen exists; the layer is designed so a future plugin (Crow's Foot, UML) can drop in without touching the canvas / interaction layers.

## The plugin contract

<<< ../../../src/notation/types.ts#notation-plugin

## Chen as the reference implementation

`src/notation/chen/`:

- `toolbar.ts` — toolbar groups (Select, Elements, Connections) and the tool ids.
- `nodeRenderers.ts` — React components for each `NodeKind` (`entity`, `relationship`, `attribute`, `isa`).
- `edgeRenderers.ts` — React components for each `EdgeKind` (entity↔relationship branches with cardinality, attribute connectors, ISA branches).
- `rules/` — validation rules. Each rule is a function `(diagram) => Violation[]`.
- `codecs/` — see [Codecs](./codecs).

## Adding a new notation

The path is:

1. Create `src/notation/myNotation/` mirroring `src/notation/chen/`.
2. Implement the contract — tools, renderers, rules, codecs.
3. Re-export from `src/notation/index.ts`.
4. Wire a notation-picker in the UI (out of scope for today; Chen is hard-wired everywhere).

In practice, "a new notation" overlaps heavily with Chen on data shapes — the renderer + rules differ but the underlying `Diagram` model is shared.

## Where to next

- [Codecs](./codecs) — how each notation handles serialization.
- [API Reference: notation](../../api/notation/) — the plugin contract types.
