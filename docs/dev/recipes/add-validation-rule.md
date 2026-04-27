# Recipe: add a new validation rule

We'll add a rule that warns when an entity has more than 8 attributes (a common modelling smell).

## 1. Write the rule

Create `src/notation/chen/rules/entityAttributeLimit.ts`:

```typescript
import type { Diagram, ValidationViolation } from '@/domain/types'

export const entityAttributeLimit = (diagram: Diagram): readonly ValidationViolation[] => {
  const ATTRIBUTE_LIMIT = 8
  const violations: ValidationViolation[] = []

  for (const node of diagram.nodes.values()) {
    if (node.kind !== 'entity') continue
    const attributeCount = countAttributesFor(diagram, node.id)
    if (attributeCount > ATTRIBUTE_LIMIT) {
      violations.push({
        kind: 'warning',
        ruleId: 'entity.attribute-limit',
        targetId: node.id,
        messageKey: 'validation.entity.attribute-limit',
        messageParams: { count: String(attributeCount), limit: String(ATTRIBUTE_LIMIT) },
      })
    }
  }
  return violations
}

const countAttributesFor = (diagram: Diagram, entityId: NodeId): number => {
  let n = 0
  for (const edge of diagram.edges.values()) {
    if (edge.kind === 'attribute' && edge.entity === entityId) n++
  }
  return n
}
```

## 2. Register in the rule list

```diff
// src/notation/chen/rules/index.ts
+import { entityAttributeLimit } from './entityAttributeLimit'

 export const validateChen = (diagram: Diagram): readonly ValidationViolation[] => [
   ...entityKey(diagram),
   ...weakEntityRules(diagram),
+  ...entityAttributeLimit(diagram),
   /* existing rules */
 ]
```

## 3. Add i18n strings

```diff
// src/platform/i18n/locales/en/validation.json
 "entity": {
+  "attribute-limit": "Entity has {{count}} attributes (more than {{limit}}); consider splitting into multiple entities."
 }
```

(Italian likewise.)

## 4. Test

```typescript
// src/notation/chen/rules/entityAttributeLimit.test.ts
import { describe, it, expect } from 'vitest'
import { entityAttributeLimit } from './entityAttributeLimit'
import { fixtureWithEntityAndNAttributes } from '@fixtures/diagrams'

describe('entityAttributeLimit', () => {
  it('does not flag an entity with 8 attributes', () => {
    const diagram = fixtureWithEntityAndNAttributes(8)
    expect(entityAttributeLimit(diagram)).toHaveLength(0)
  })
  it('flags an entity with 9 attributes', () => {
    const diagram = fixtureWithEntityAndNAttributes(9)
    const violations = entityAttributeLimit(diagram)
    expect(violations).toHaveLength(1)
    expect(violations[0].kind).toBe('warning')
  })
})
```

## 5. Surface in the user docs

Add a row to `docs/user/tasks/validation.md`'s warnings table:

```diff
 | Entity X has no attributes | Permitted but unusual; usually a forgotten attribute. |
+| Entity X has 9 attributes (more than 8); consider splitting | Modelling smell — large entities suggest decomposition. |
```

## 6. Verify

```bash
pnpm typecheck && pnpm lint && pnpm test --run
```

Then in the browser, create an entity with 9+ attributes and confirm a warning badge appears.

## Where to next

- [Chen validation rules reference](../reference/chen-validation-rules).
- [Concepts: Domain — invariants vs validation](../concepts/domain).
