# Domain

The domain layer (`src/domain/`) is the pure-data heart of the codebase. No React, no stores, no I/O — just types and pure functions.

## The Diagram type

A diagram is a small graph with stable node and edge ordering:

<<< ../../../src/domain/types.ts#diagram-type

`nodeOrder` and `edgeOrder` track insertion order independent of the maps — this is what gives the codec deterministic output.

## Nodes

A node is a discriminated union over four kinds:

<<< ../../../src/domain/types.ts#node-discrim

The kind field is the discriminant — every consumer narrows on it before reading kind-specific fields. TypeScript's exhaustiveness checking catches missing cases.

## Edges

Edges are likewise discriminated:

<<< ../../../src/domain/types.ts#edge-discrim

Three kinds capture the legal Chen connections — entity↔relationship branches (with cardinality and participation), entity→attribute, and parent→child ISA.

## Branded ids

Node ids and edge ids are TypeScript branded types — they're strings at runtime but distinct types at compile time:

```typescript
const id: NodeId = 'n-42' as NodeId  // requires the cast
```

This catches mistakes like passing an `EdgeId` where a `NodeId` is expected, even though both are strings.

## Invariants

`src/domain/invariants.ts` exports `checkInvariants(diagram)` returning a list of violations. The bootstrap subscriber runs this on every diagram change in dev mode and logs violations to the console. Invariants enforce structural rules that should never be violated by valid edits — if they fire, you've found a bug.

## Where to next

- [Concepts: State](./state) — how the domain types flow into reactive stores.
- [API Reference: domain](../../api/domain/) — every public type and helper.
