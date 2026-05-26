# Appendices

## Appendix A — URL Parameters

The editor reads a small set of URL flags at start-up. A Moodle host configures the
integration declaratively by setting these on the embedded iframe's URL; they can also be
used directly for testing.

| Flag | Values | Effect |
|------|--------|--------|
| `lang` | `en` \| `it` | Sets the interface language. |
| `validation` | `on` \| `off` | Enables or disables the validation engine. |
| `readonly` | present / absent | Restricts the tools to selection and pan; mutations are blocked. |
| `embed` | present / absent | Embed mode: hides the file menu (the host owns Save/Open/Export) and activates the Moodle bridge. The drawing toolbar stays visible so the student can still build the diagram. |
| `examMode` | present / absent | Forces validation off and disables the Save/Export/validation controls, so the tool does not coach the student during a graded assessment. |
| `parentOrigin` | an origin URL | The origin the editor trusts as the message target for `postMessage`; used to address autosave/save messages to the host. |

## Appendix B — Chen Validation Rules

The validation engine ships 33 rules, grouped by category below. Each is an independent
check that takes the whole diagram and returns the elements that violate it. Rules with
severity *error* mark the diagram invalid; *warning* rules flag likely mistakes without
blocking. Messages are shown in their English form; placeholders such as "…" and *n* are
filled in at runtime.

### Entity (10)

| Severity | Rule | Meaning |
|----------|------|---------|
| error | `must-have-key` | Strong entity must have at least one key attribute. |
| error | `weak-missing-discriminant` | Weak entity must have a discriminant attribute. |
| error | `must-have-attribute` | Entity must have at least one attribute. |
| error | `weak-total-participation` | Weak entity must have total participation in the identifying relationship. |
| error | `weak-not-on-1-side` | Weak entity cannot be on the 1-side of the identifying relationship (must be N-side). |
| error | `weak-single-identifying` | Weak entity must connect to exactly one identifying relationship. |
| error | `name-unique` | Entity name is already used by another entity. |
| error | `name-non-empty` | Entity name must not be empty. |
| warning | `orphan-warning` | Entity has no relationships (may be incomplete). |
| error | `weak-no-key` | Weak entity must not have a key attribute; use a discriminant (partial key) instead. |

### Relationship (7)

| Severity | Rule | Meaning |
|----------|------|---------|
| error | `min-two-entities` | Relationship must connect at least 2 entities (or be a recursive relationship). |
| error | `cardinality-required` | All connections on this relationship must have cardinality defined. |
| error | `participation-required` | All connections on this relationship must have participation defined. |
| error | `identifying-needs-weak` | Identifying relationship must connect at least one weak entity. |
| error | `non-identifying-not-weak` | Non-identifying relationship is connected to a weak entity; it should probably be marked identifying. |
| error | `name-unique` | Relationship name is already used by another relationship. |
| error | `recursive-roles-distinct` | Recursive relationship must have distinct, non-empty roles on both edges. |

### Attribute (12)

| Severity | Rule | Meaning |
|----------|------|---------|
| error | `single-parent` | Attribute must connect to exactly one parent (entity, relationship, or composite attribute). |
| error | `no-dual-parent` | Attribute cannot connect to both an entity and a relationship. |
| error | `discriminant-weak-only` | Discriminant is only valid on attributes of a weak entity. |
| error | `not-key-and-derived` | Attribute cannot be both key and derived. |
| error | `key-not-multivalued` | Key attribute cannot be multivalued. |
| error | `discriminant-not-multivalued` | Discriminant cannot be multivalued. |
| error | `relationship-not-key` | Attributes of a relationship cannot be key attributes. |
| error | `name-unique` | Attribute name is already used by another attribute on the same parent. |
| error | `composite-needs-sub` | Composite attribute should have at least one sub-attribute. |
| error | `sub-not-key` | Sub-attribute cannot be a key attribute. |
| error | `sub-not-discriminant` | Sub-attribute cannot be a discriminant. |
| error | `sub-not-composite` | Sub-attribute cannot itself be composite (only one level of nesting). |

### Generalisation (3)

| Severity | Rule | Meaning |
|----------|------|---------|
| error | `parent-exists` | A generalisation (IS-A) must have a parent entity. |
| error | `has-children` | A generalisation (IS-A) must have at least one child. |
| warning | `single-child-warning` | An IS-A with a single child is semantically weak — consider whether specialisation is meaningful. |

### Structural (1)

| Severity | Rule | Meaning |
|----------|------|---------|
| error | `dangling-edge` | An edge references a node that does not exist. |
