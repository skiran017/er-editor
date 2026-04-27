# Layers

The five layers form a strict left-to-right dependency chain. Lower layers know nothing about higher layers.

## The rule

```
domain → state → interaction → canvas → ui
```

Each arrow is a **may-import** relationship. Reversing any arrow breaks the build via the lint rule below.

## Enforcement

ESLint's `import/no-restricted-paths` rule is configured per-layer in `eslint.config.js`:

<<< ../../../eslint.config.js#layer-rule

The rule lists, for each source layer, which target layers it may NOT import from. CI fails if a violation creeps in.

## Why this shape

- **Domain is pure.** No React, no stores, no DOM, no async. Easy to test (`pnpm test --run domain`).
- **State holds reactive truth.** Stores are subscribable; selectors give consumers fine-grained re-renders.
- **Interaction owns transitions.** The FSM is the only thing that can change tools, start/end drags, etc. Components dispatch events; they don't mutate the FSM directly.
- **Canvas adapts.** Domain → React Flow, React Flow → domain patches. The adapter is the only place that knows React Flow's shape.
- **UI is "just the chrome."** Hooks read stores via selectors; mutations go through actions, not setState calls.

## A quick test

If you find yourself wanting to import `useUiStore` from inside `src/domain/`, **stop**. Either:
- The thing you want is wrong — domain shouldn't know about UI state.
- The thing belongs at a higher layer.

Same heuristic for every cross-layer import: check the direction matches the rule.

## Notation is orthogonal

`src/notation/` sits beside the main chain — it depends on `domain` (for the data types) and is depended on by `state`, `interaction`, and `canvas` (for the codecs, validation rules, and renderers). It's a sibling to `state`, not part of the main chain.

## Where to next

- [Concepts](../concepts/domain) — the actual content of each layer.
- [Recipes](../recipes/add-tool) — practical changes that exercise the rules.
