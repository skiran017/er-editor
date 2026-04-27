# Recipe: add a new edge kind

We'll add a hypothetical **DependencyEdge** — a dashed arrow showing one entity depends on another. This adds to the `Edge` discriminated union, the invariants, the renderers, and the React Flow adapter.

## 1. Extend the `Edge` union

```diff
// src/domain/types.ts
 export type Edge =
   | EntityRelationshipEdge
   | AttributeEdge
   | ISAEdge
+  | DependencyEdge

+export interface DependencyEdge {
+  readonly id: EdgeId
+  readonly kind: 'dependency'
+  readonly source: NodeId  // entity that depends
+  readonly target: NodeId  // entity depended on
+  readonly waypoints?: readonly Point[]
+}
```

## 2. Update invariants

```diff
// src/domain/invariants.ts
 case 'isa': /* existing */ break
+case 'dependency': {
+  const sourceNode = diagram.nodes.get(edge.source)
+  const targetNode = diagram.nodes.get(edge.target)
+  if (!sourceNode || !targetNode) {
+    violations.push({ invariantId: 'edge.endpoint-exists', targetId: edge.id, detail: '...' })
+  }
+  if (sourceNode?.kind !== 'entity' || targetNode?.kind !== 'entity') {
+    violations.push({ invariantId: 'dependency.entities-only', targetId: edge.id, detail: '...' })
+  }
+  break
+}
```

## 3. Add a renderer

Create `src/notation/chen/edgeRenderers/DependencyEdge.tsx` with a React component that renders a dashed `<path>` from source to target. Follow the pattern of `EntityRelationshipEdge.tsx` for floating-edge geometry.

## 4. Wire into chenBindings

```diff
// src/canvas/notation-adapters/chenBindings.ts
+import { DependencyEdge } from '@/notation/chen/edgeRenderers/DependencyEdge'

 export const chenEdgeTypes = {
   entity_relationship: EntityRelationshipEdge,
   attribute: AttributeEdge,
   isa: ISAEdge,
+  dependency: DependencyEdge,
 } as const
```

## 5. Update the diagram-to-RF adapter

```diff
// src/canvas/adapters/diagramToRf.ts
 const edgeTypeFromKind = (kind: EdgeKind): string => {
   switch (kind) {
     case 'entity_relationship': return 'entity_relationship'
     case 'attribute':            return 'attribute'
     case 'isa':                  return 'isa'
+    case 'dependency':           return 'dependency'
   }
 }
```

## 6. Tests

- Domain: `src/domain/invariants.test.ts` — add cases for the new dependency invariants.
- Renderer: `src/notation/chen/edgeRenderers/DependencyEdge.test.tsx` — render with synthetic node positions, assert the `<path>` has the dashed style.
- Adapter: `src/canvas/adapters/diagramToRf.test.ts` — add a case for the new kind.

## 7. Verify

```bash
pnpm typecheck && pnpm lint && pnpm test --run
```

Then create a `dependency` edge in DevTools and confirm it renders.

## Where to next

- [Add a codec](./add-codec) — to round-trip the new edge kind through XML.
- [Concepts: Domain](../concepts/domain).
