# Validation System Documentation

## Overview

This document describes the validation rules for the ER Diagram Editor, based on ER theory (Chen notation), professor feedback, and analysis of the Java application (`ERDesigner.jar`).

---

## Chen Notation ER Design Rules — Complete Reference

This section provides a comprehensive reference of ER design rules specific to Chen notation.

### Entities

1. **Strong Entity Key Requirement**
   - Every strong (regular) entity must have at least one key attribute (underlined)
   - The key uniquely identifies each entity instance

2. **Weak Entity Requirements**
   - Must have a discriminant attribute (partial key, dashed underline)
   - Must participate in exactly one identifying relationship (double diamond)
   - Must have **total participation** (double line) in the identifying relationship
   - Must be on the **N-side** of the identifying relationship (cannot be on 1-side)
   - The discriminant + owner entity's key together form the full identifier

3. **Entity Attributes**
   - Every entity should have at least one attribute
   - Entity names must be unique across the diagram

4. **ISA (Generalization) Hierarchy**
   - Child entities inherit ALL attributes from the parent, including the key
   - Children do NOT need their own key attribute (they use the inherited key)
   - Children inherit parent attributes and are valid even with zero own attributes
   - A child cannot be its own parent (no cycles)
   - Children should not be weak entities (different concept)

### Relationships

1. **Connectivity**
   - Every relationship must connect at least 2 entities
   - Relationships represent associations between entities

2. **Cardinality**
   - Must be specified on each connection: **1** (one), **N** (many), **M** (many)
   - Defines how many instances of each entity can participate
   - Common patterns: 1:1, 1:N, M:N

3. **Participation**
   - **Partial** (single line): entity instances can exist without participating
   - **Total** (double line): every entity instance must participate
   - Example: Employee WORKS_FOR Department (total from Employee = all employees must work for a department)

4. **Identifying Relationships**
   - Shown as double diamond (weak relationship)
   - Connects a weak entity to its owner (identifying/parent entity)
   - Must connect at least one weak entity
   - Weak entity must have total participation

5. **Relationship Attributes**
   - Attributes can be attached to relationships (e.g., "grade" on ENROLLS)
   - Relationship attributes describe the relationship itself
   - Cannot be marked as key attributes (relationships don't have keys)

### Attributes

1. **Attribute Types**
   - **Simple**: Single atomic value
   - **Composite**: Can be divided into sub-attributes (not fully supported yet)
   - **Multivalued** (double oval): Can have multiple values per entity instance
   - **Derived** (dashed oval): Calculated from other attributes

2. **Key Attribute Rules**
   - Cannot be multivalued (key must be single-valued to uniquely identify)
   - Cannot be derived (key must be stored, not calculated)
   - Must belong to an entity (not a relationship)
   - Strong entities: at least one key attribute required
   - ISA children: inherit key from parent

3. **Discriminant (Partial Key) Rules**
   - Only valid for weak entity attributes
   - Cannot be multivalued
   - Combined with owner's key to identify weak entity instances

4. **Attachment**
   - Every attribute must attach to exactly one entity OR one relationship (XOR)
   - Cannot attach to both

### Generalization (ISA)

1. **Structure**
   - Triangle symbol with "ISA" label
   - Parent (superclass) at the top
   - Children (subclasses) connected at the bottom

2. **Inheritance**
   - Children inherit **all** attributes from parent
   - Children inherit the parent's **key**
   - Children add specialized attributes relevant to their subtype

3. **Validation**
   - Must have at least one child (preferably 2+ for meaningful specialization)
   - Parent and all children must exist in the diagram
   - Children should NOT be required to have their own key

4. **Disjoint vs. Overlapping**
   - Disjoint (d): entity instance belongs to at most one subclass
   - Overlapping (o): entity instance can belong to multiple subclasses
   - (Currently not enforced in the tool)

5. **Total vs. Partial**
   - Total: every parent instance must belong to at least one subclass
   - Partial: parent instances can exist without being in any subclass
   - (Currently not enforced in the tool)

### Connections

1. **Definition**
   - Lines connecting entities to relationships
   - Each connection has cardinality and participation

2. **Cardinality Combinations**
   - **1:1** — one-to-one (e.g., Person HAS Passport)
   - **1:N** — one-to-many (e.g., Department HAS Employees)
   - **M:N** — many-to-many (e.g., Students ENROLL Courses)

3. **Participation Rules**
   - Total participation requires every instance to participate
   - Weak entities must have total participation in their identifying relationship

### Common Patterns & Pitfalls

**Pattern: Weak Entity**
```
Building (1) --[CONTAINS]-- (N) Room
         strong          identifying    weak
                       (double diamond) (double rectangle)
```
- Room is weak (double rectangle)
- Room has discriminant "room_number" (dashed underline)
- CONTAINS is identifying relationship (double diamond)
- Room has total participation (double line from Room)
- Room is on N-side (many rooms per building)

**Pattern: ISA Hierarchy**
```
          Employee (key: emp_id)
              |
            [ISA]
           /     \
    Hourly      Salaried
   (+ wage)    (+ salary)
```
- Hourly and Salaried inherit emp_id (no own key needed)
- Children add specialized attributes
- Hourly and Salaried are valid with just their specialized attributes

**Pitfall: Multivalued Key**
```
❌ Person: phone_number (key, multivalued)
```
- Cannot be both key and multivalued
- Key must be single-valued to uniquely identify

**Pitfall: Weak Entity on 1-Side**
```
❌ Room (1) --[CONTAINS]-- (N) Furniture
     weak                        strong
```
- Weak entity cannot be on 1-side
- Must be on N-side of identifying relationship

---

## Validation Rules (Detailed)

Rules are categorized as:
- **Implemented** — already in `src/lib/validation.ts`
- **Missing (Must-Have)** — required for correct ER design, not yet implemented
- **Missing (Nice-to-Have)** — useful warnings, lower priority

---

## 1. Entity Rules

### 1.1 Strong Entity Must Have a Key Attribute
- Every strong (regular) entity must have at least one attribute with `isKey = true`.
- **Status**: Implemented

### 1.2 Weak Entity Must Have a Discriminant
- Every weak entity must have at least one attribute with `isDiscriminant = true`.
- The discriminant + owner entity's key together identify the weak entity.
- **Status**: Implemented

### 1.3 Entity Must Have at Least One Attribute
- Every entity (strong or weak) should have at least one attribute.
- **Status**: Implemented

### 1.4 Weak Entity Must Have Total Participation in Its Identifying Relationship
- A weak entity is existence-dependent on its owner. It must participate with **total participation** (double line) in its identifying (weak) relationship.
- **Status**: Missing (Must-Have)

### 1.5 Weak Entity Must Be on the N-Side of Its Identifying Relationship
- A weak entity cannot be on the 1-side of a 1:N identifying relationship. It must always be on the N-side (many side).
- Example: If `Room` is weak and identified through `Building`, then `Room` is on the N-side (many rooms per building).
- **Professor feedback**: "weak cannot be on 1 side in a 1-N"
- **Status**: Missing (Must-Have)

### 1.6 Weak Entity Must Be Connected to Exactly One Identifying Relationship
- A weak entity must participate in exactly one identifying (weak/double-diamond) relationship that connects it to its owner entity.
- **Status**: Missing (Must-Have)

### 1.7 ISA Child Entities Inherit Key from Parent
- Entities that are children in an ISA (generalization) hierarchy **inherit all attributes from the parent, including the key**. They should NOT be required to have their own key attribute.
- **Professor feedback**: "for children of ISA you ask for a key" — this is wrong, children inherit the parent's key.
- **Status**: Missing (Must-Have) — current validation wrongly flags ISA children for missing key

### 1.8 ISA Child Entities Inherit Attributes from Parent
- If an entity is a child in a generalization, it inherits the parent's attributes. The child is valid even if it has zero of its own attributes (it still has the inherited ones).
- **Professor feedback**: ISA restructured children wrongly flagged for "Entity must have at least one attribute"
- **Status**: Missing (Must-Have) — current validation wrongly flags ISA children for missing attributes

### 1.9 Entity Names Must Be Unique
- No two entities can share the same name (case-insensitive).
- **Status**: Implemented (via `checkUniqueEntityName`)

### 1.10 Entity Names Must Be Non-Empty
- An entity must have a non-empty name.
- **Status**: Implemented (via `isValidEntityName`)

---

## 2. Relationship Rules

### 2.1 Relationship Must Connect at Least 2 Entities
- Every relationship must have at least 2 entity connections.
- **Status**: Implemented

### 2.2 All Connections Must Have Cardinality Defined
- Every connection to/from a relationship must have a cardinality value.
- **Status**: Implemented

### 2.3 All Connections Must Have Participation Defined
- Every connection must have participation set to `"partial"` or `"total"`.
- **Status**: Implemented

### 2.4 Identifying (Weak) Relationship Must Connect at Least One Weak Entity
- A relationship marked as `isWeak = true` must connect to at least one weak entity.
- **Status**: Implemented

### 2.5 Non-Identifying Relationship Should Not Be Marked as Weak
- A relationship connecting only strong entities should not be marked as identifying (weak).
- **Status**: Missing (Nice-to-Have)

### 2.6 Relationship Names Must Be Unique
- No two relationships can share the same name (case-insensitive).
- **Status**: Implemented (via `checkUniqueRelationshipName`)

### 2.7 Recursive Relationship Must Have Distinct Role Names
- When an entity participates in a relationship with itself (recursive/self-relationship), each connection should have a distinct role to avoid ambiguity (e.g., "supervisor" / "supervisee").
- **Status**: Missing (Nice-to-Have) — role names not yet supported

---

## 3. Attribute Rules

### 3.1 Attribute Must Connect to Exactly One Parent
- Every attribute must connect to exactly one entity OR exactly one relationship (XOR).
- **Status**: Implemented

### 3.2 Attribute Cannot Connect to Both Entity and Relationship
- An attribute cannot have both `entityId` and `relationshipId` set.
- **Status**: Implemented

### 3.3 Discriminant Only Valid for Weak Entity Attributes
- `isDiscriminant = true` is only valid on attributes belonging to weak entities.
- Cannot be used on relationship attributes.
- **Status**: Implemented

### 3.4 Attribute Cannot Be Both Key and Derived
- A derived attribute (calculated from other data) cannot serve as a key.
- **Status**: Implemented

### 3.5 Key Attribute Cannot Be Multivalued
- A primary key must uniquely identify an entity instance. A multivalued attribute cannot serve as a key because it has multiple values per instance.
- **Professor feedback**: "a primary key cannot be multivalued"
- **Status**: Missing (Must-Have)

### 3.6 Discriminant Cannot Be Multivalued
- Same reasoning as 3.5: a discriminant is part of the composite key for weak entities and cannot hold multiple values.
- **Status**: Missing (Must-Have)

### 3.7 Relationship Attributes Cannot Be Key Attributes
- In Chen notation, relationships do not have primary keys. Attributes of relationships describe the relationship itself (e.g., "grade" on an "enrolls" relationship), and cannot be marked as key.
- **Status**: Missing (Must-Have)

### 3.8 Attribute Names Must Be Unique Within Parent
- No two attributes of the same parent entity/relationship can share the same name.
- **Status**: Implemented (via `checkUniqueAttributeName`)

---

## 4. Connection Rules

### 4.1 Connection Must Connect Valid Elements
- Both `fromId` and `toId` must reference existing entities or relationships.
- **Status**: Implemented

### 4.2 Cardinality Format Validation
- Cardinality must be a valid format: `1`, `N`, `M`.
- **Status**: Implemented

### 4.3 Participation Format Validation
- Participation must be `"partial"` or `"total"`.
- **Status**: Implemented

---

## 5. Generalization (ISA) Rules

### 5.1 Parent Entity Must Exist
- The parent (superclass) entity must exist in the diagram.
- **Status**: Implemented

### 5.2 Must Have at Least One Child
- A generalization must have at least one child (subclass) entity.
- **Status**: Implemented

### 5.3 Should Have at Least 2 Children
- A generalization with only 1 child is semantically meaningless — the purpose of ISA is to specialize into multiple subtypes.
- **Status**: Missing (Nice-to-Have)

### 5.4 Parent Cannot Be Its Own Child
- The parent entity cannot appear in its own child list.
- **Status**: Implemented

### 5.5 All Children Must Exist
- Every child entity referenced in `childIds` must exist in the diagram.
- **Status**: Implemented

### 5.6 Child Entities Should Not Be Weak
- Weak entities should not participate as children in a generalization. The ISA hierarchy is a specialization of strong entities. A weak entity depends on its owner entity through an identifying relationship, which is a different concept.
- **Status**: Missing (Nice-to-Have)

### 5.7 Child Inherits Key — Do Not Require Own Key
- See Rule 1.7. Children inherit the parent's key and should not be flagged for missing key attributes.
- **Status**: Missing (Must-Have)

### 5.8 Child Inherits Attributes — Do Not Require Own Attributes
- See Rule 1.8. Children inherit the parent's attributes and should not be flagged for having zero own attributes.
- **Status**: Missing (Must-Have)

---

## 6. Structural / Diagram-Level Rules

### 6.1 Orphan Entity Warning
- An entity with no relationships is likely incomplete. Show a warning (not an error).
- **Status**: Missing (Nice-to-Have)

### 6.2 Orphan Attribute Warning
- An attribute without a parent entity/relationship is invalid.
- **Status**: Implemented (via Rule 3.1)

---

## Implementation Priority

### Phase 4A — Must-Have (Professor Feedback)

These directly address professor feedback items 9–12:

| Rule | Description | Fixes |
|------|-------------|-------|
| 1.7 + 5.7 | ISA children inherit key from parent — don't require own key | Bug 12 |
| 1.8 + 5.8 | ISA children inherit attributes — don't require own attributes | Bug 9 |
| 1.5 | Weak entity cannot be on 1-side of identifying relationship | Bug 10 |
| 3.5 | Key attribute cannot be multivalued | Bug 11 |

### Phase 4B — Must-Have (ER Theory)

| Rule | Description |
|------|-------------|
| 1.4 | Weak entity must have total participation in identifying relationship |
| 1.6 | Weak entity must connect to exactly one identifying relationship |
| 3.6 | Discriminant cannot be multivalued |
| 3.7 | Relationship attributes cannot be key attributes |

### Phase 4C — Nice-to-Have

| Rule | Description |
|------|-------------|
| 2.5 | Non-identifying relationship should not be marked weak |
| 2.7 | Recursive relationship distinct role names |
| 5.3 | Generalization should have at least 2 children |
| 5.6 | Child entities in ISA should not be weak |
| 6.1 | Orphan entity warning |

---

## Validation Architecture

### Functions (`src/lib/validation.ts`)

- `validateEntity(entity, diagram): string[]`
- `validateRelationship(relationship, diagram): string[]`
- `validateAttribute(attribute, diagram): string[]`
- `validateConnection(connection, diagram): string[]`
- `validateGeneralization(gen, diagram): string[]`
- `validateDiagram(diagram): ValidationError[]`

### Store Integration (`src/store/editorStore.ts`)

- `validateElement(id)` — validate a single element
- `validateAll()` — validate entire diagram
- `getValidationErrors()` — get all errors
- Auto-validation on mutations (add, update, delete)

### Visual Display

- Red warning badge ("!") on elements with warnings
- Hover tooltip showing warning messages
- `hasWarning: boolean` and `warnings: string[]` on Entity, Relationship, Attribute

### Configuration

- `validationEnabled: boolean` (default: false, toggle in Menu)
- Exam mode via `?examMode=true` query parameter

---

## References

- Peter Chen, "The Entity-Relationship Model" (1976)
- Elmasri & Navathe, "Fundamentals of Database Systems"
- Java ERDesigner: `ch.supsi.dlob.erdesigner.ERDController`, `ERDModel`, `ERDGlobals`
- Implementation: `src/lib/validation.ts`
