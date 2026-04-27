# Chen validation rules

The complete reference of validation rules enforced by `validateChen` (`src/notation/chen/rules/`). User-facing explanations live at [Validation](../../user/tasks/validation); this page is the implementer's source of truth.

## Entities

### entity.has-name

An entity must have a non-empty name. Implemented in `entity.ts`.

### entity.unique-name

No two entities can share the same name (case-insensitive).

### entity.has-attribute

Every entity (strong or weak) should have at least one attribute. ISA children are exempt — see [`isa.children-inherit-attributes`](#isa-children-inherit-attributes).

### entity.strong-has-key

Every strong (regular) entity must have at least one attribute with `isKey = true`. The key uniquely identifies each entity instance. ISA children are exempt — see [`isa.children-inherit-key`](#isa-children-inherit-key).

### entity.weak-has-discriminant

Every weak entity must have at least one attribute with `isDiscriminant = true`. The discriminant combined with the owner entity's key forms the full identifier of the weak entity.

### entity.weak-total-participation

A weak entity is existence-dependent on its owner. It must participate with **total participation** (double line) in its identifying (weak) relationship.

### entity.weak-on-n-side

A weak entity cannot be on the 1-side of a 1:N identifying relationship. It must always be on the N-side (many side). Example: if `Room` is weak and identified through `Building`, then `Room` is on the N-side (many rooms per building).

### entity.weak-one-identifying-relationship

A weak entity must participate in exactly one identifying (weak / double-diamond) relationship that connects it to its owner entity.

## Relationships

### relationship.has-name

A relationship must have a non-empty name.

### relationship.unique-name

No two relationships can share the same name (case-insensitive).

### relationship.connects-two-entities

Every relationship must connect at least 2 entities. Relationships represent associations between entities.

### relationship.connections-have-cardinality

Every connection to / from a relationship must have a cardinality value. Valid values are `1`, `N`, `M`.

### relationship.connections-have-participation

Every connection must have participation set to `"partial"` or `"total"`.

### relationship.identifying-connects-weak

A relationship marked as `isWeak = true` (identifying / double-diamond) must connect to at least one weak entity.

### relationship.non-identifying-not-weak (nice-to-have)

A relationship connecting only strong entities should not be marked as identifying (weak). Currently flagged as a warning candidate — not implemented.

### relationship.recursive-distinct-roles (nice-to-have)

When an entity participates in a relationship with itself (recursive / self-relationship), each connection should have a distinct role to avoid ambiguity (e.g. "supervisor" / "supervisee"). Not implemented — role names not yet supported.

## Attributes

### attribute.has-name

An attribute must have a non-empty name.

### attribute.unique-name-within-parent

No two attributes of the same parent entity / relationship can share the same name.

### attribute.exactly-one-parent

Every attribute must connect to exactly one entity OR exactly one relationship (XOR). It cannot have both `entityId` and `relationshipId` set, and it cannot have neither.

### attribute.key-not-multivalued

A primary key must uniquely identify an entity instance. A multivalued attribute cannot serve as a key because it has multiple values per instance.

### attribute.key-not-derived

A derived attribute is calculated from other data and cannot serve as a key — keys must be stored, not computed.

### attribute.discriminant-only-on-weak

`isDiscriminant = true` is only valid on attributes belonging to weak entities. It cannot be used on relationship attributes or on attributes of strong entities.

### attribute.discriminant-not-multivalued

A discriminant is part of the composite key for weak entities and, like a primary key, cannot hold multiple values per instance.

### attribute.relationship-not-key

In Chen notation, relationships do not have primary keys. Attributes of relationships describe the relationship itself (e.g. "grade" on an `enrolls` relationship) and cannot be marked as key.

## ISA hierarchies

### isa.parent-exists

The parent (superclass) entity referenced by the generalization must exist in the diagram.

### isa.has-children

A generalization must have at least one child (subclass) entity.

### isa.has-two-children

A generalization with only one child is semantically meaningless — the purpose of ISA is to specialize into multiple subtypes. Two or more children are expected.

### isa.parent-not-self

The parent entity cannot appear in its own child list (no cycles).

### isa.children-exist

Every child entity referenced in `childIds` must exist in the diagram.

### isa.children-not-weak

Weak entities should not participate as children in a generalization. The ISA hierarchy is a specialization of strong entities; a weak entity depends on its owner through an identifying relationship, which is a different concept.

### isa.children-inherit-key

Children of an ISA hierarchy inherit all attributes from the parent, including the key. They should NOT be flagged for missing key attributes — the inherited key is the child's key.

### isa.children-inherit-attributes

Children of an ISA hierarchy inherit the parent's attributes. A child is valid even when it has zero of its own attributes — it still has the inherited ones — and should not be flagged for "Entity must have at least one attribute".

## Connections

### connection.endpoints-exist

Both `fromId` and `toId` of a connection must reference existing entities or relationships.

### connection.cardinality-format

Cardinality must be a valid Chen-notation token: `1`, `N`, or `M`.

### connection.participation-format

Participation must be `"partial"` or `"total"`.

## Structural / diagram-level

### structural.orphan-entity (warning)

An entity with no relationships is likely incomplete. Surfaced as a warning, not an error.

### structural.orphan-attribute

An attribute without a parent entity / relationship is invalid. Enforced through [`attribute.exactly-one-parent`](#attribute-exactly-one-parent).

## Where to next

- [Recipes: Add a validation rule](../recipes/add-validation-rule).
- [User docs: Validation](../../user/tasks/validation).
