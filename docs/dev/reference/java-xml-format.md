# Java XML format reference

The file format produced and consumed by the legacy ERDesigner Java app (`ERDesigner.jar`, ~Nov 2021). ER Editor v2 round-trips with this format via `src/notation/chen/codecs/javaXml/`.

## File structure

XML root: `<ERDatabaseModel>`. Two children:
- `<ERDatabaseSchema>` — the model: entities, relationships, attributes, generalizations.
- `<ERDatabaseDiagram>` — the layout: positions and sizes for the visible representation of every model element.

A complete file looks like:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ERDatabaseModel>
  <ERDatabaseSchema name="..." lastId="...">
    <EntitySets>...</EntitySets>
    <RelationshipSets>...</RelationshipSets>
    <Generalizations>...</Generalizations>
  </ERDatabaseSchema>
  <ERDatabaseDiagram>...</ERDatabaseDiagram>
</ERDatabaseModel>
```

## Package origins

The schema mirrors the Java package layout from the JAR:
- `ch.supsi.database.erconstructs` — model constructs (`EntitySet`, `RelationshipSet`, `Generalization`, attributes).
- `ch.supsi.dlob.erdesigner.graphicconstructs` — graphic representations (`MyEntity`, `MyRelationship`).
- `ch.supsi.database.io` — `XMLReader` and `XMLWriter` round-trip the file.

## Constants

From `ch.supsi.dlob.erdesigner.graphicconstructs.ERDGraphicsGlobal`:

| Constant | Value | Used by |
|---|---|---|
| `ENTITY_WIDTH` | `80.0` | Default entity rectangle width. |
| `ENTITY_HEIGHT` | `40.0` | Default entity rectangle height. |
| `BORDER_SIZE` | `50` | Diagram border padding. |
| `POPUP_DISTANCE_X` | `80` | Default attribute offset from its parent. |

Entity sizes are not stored per-element in the XML — they are reconstructed from these defaults.

## Element reference

### `<ERDatabaseModel>`

Root element. No attributes. Children (in order): `<ERDatabaseSchema>`, `<ERDatabaseDiagram>`.

### `<ERDatabaseSchema>`

Required attributes:
- `name` — schema display name.
- `lastId` — highest id in use across all model elements (used by Java to allocate new ids).

Children: `<EntitySets>`, `<RelationshipSets>`, `<Generalizations>`. Each may be empty (`<EntitySets />`).

### `<EntitySets>`

Container. No attributes. Children are `<StrongEntitySet>` and / or `<WeakEntitySet>` elements.

### `<StrongEntitySet>`

Required attributes:
- `id` — integer.
- `name` — entity name.

Children:
- `<Attributes>` — container of `<SimpleAttribute>` / `<CompositeAttribute>` (may be empty).
- `<PrimaryKey>` — list of `<SimpleAttribute refid="...">` / `<CompositeAttribute refid="...">` references into the entity's own `<Attributes>`. Empty / absent means no key declared.

### `<WeakEntitySet>`

Required attributes:
- `id` — integer.
- `name` — entity name.

Children:
- `<Attributes>` — same shape as on `<StrongEntitySet>`.
- `<Discriminant>` — list of attribute refs (analogue of `<PrimaryKey>` for weak entities). Empty / absent means no discriminant declared.

### `<RelationshipSets>`

Container. Children are one of seven concrete element types — the Java class hierarchy encodes the cardinality combo and the identifying flag in the element name itself:

| Element | Meaning |
|---|---|
| `<RelationshipSetOneToOne>` | 1:1 non-identifying. |
| `<RelationshipSetOneToN>` | 1:N non-identifying. |
| `<RelationshipSetNToOne>` | N:1 non-identifying. |
| `<RelationshipSetNToN>` | N:N non-identifying. |
| `<IdentifyingRelationshipSetOneToOne>` | 1:1 identifying (weak). |
| `<IdentifyingRelationshipSetOneToN>` | 1:N identifying (weak). |
| `<IdentifyingRelationshipSetNToOne>` | N:1 identifying (weak). |

All seven carry the same fields and child structure; only the element name differs.

Required attributes (on every relationship-set element):
- `id` — integer.
- `name` — relationship name.

Children:
- `<Attributes>` — container of attributes attached to the relationship.
- `<Branches>` — container of `<RelationshipSetBranch>` (may be empty).

### `<RelationshipSetBranch>`

A single connection from a relationship to one entity.

Required attributes:
- `id` — integer.
- `cardinality` — `"1"` or `"N"`.
- `totalParticipation` — `"true"` or `"false"`.
- `role` — role name string (may be empty).

Children: exactly one of `<StrongEntitySet refid="..." />` or `<WeakEntitySet refid="..." />` referencing the entity at the far end of this branch.

### `<Generalizations>`

Container. Children are `<Generalization>` (partial) or `<TotalGeneralization>` (total).

### `<Generalization>` and `<TotalGeneralization>`

Required attributes:
- `id` — integer.
- `total` — `"true"` or `"false"`. Java sets this attribute on both element types; the element name is the authoritative kind, while `total` is informational.

Children:
- `<Parent>` — wraps a single `<StrongEntitySet refid="..." />` or `<WeakEntitySet refid="..." />`.
- `<Children>` — container of `<StrongEntitySet refid="..." />` / `<WeakEntitySet refid="..." />` references (may be empty).

### `<Attributes>`

Container child of an entity or a relationship. Children are `<SimpleAttribute>` and / or `<CompositeAttribute>` elements (definitions, not refs).

### `<SimpleAttribute>` (definition)

Required attributes:
- `id` — integer.
- `name` — attribute name.
- `multiValued` — `"true"` or `"false"`.
- `derived` — `"true"` or `"false"`.

No children. Always self-closing in writer output.

### `<CompositeAttribute>` (definition)

Required attributes: `id`, `name`, `multiValued`, `derived` (same as `<SimpleAttribute>`).

Optional child:
- `<Children>` — container of nested `<SimpleAttribute>` / `<CompositeAttribute>` definitions. Absent / empty when the composite has no parts (writer emits `<CompositeAttribute ... />` self-closing).

### Reference-form attributes

Inside `<PrimaryKey>`, `<Discriminant>`, and `<ERDatabaseDiagram>`, the same element names appear in **reference form**: a single `refid` attribute pointing to a definition's `id`.

```xml
<SimpleAttribute refid="9" />
<CompositeAttribute refid="14" />
<StrongEntitySet refid="8" />
<WeakEntitySet refid="22" />
```

The element name in the reference must match the element name of the definition (the writer maintains this by looking up kinds via the schema).

### `<ERDatabaseDiagram>`

Container. Children are reference-form wrappers — one per positioned model element — each containing a single `<Position>`.

Layout of a positioned wrapper:

```xml
<StrongEntitySet refid="8">
  <Position x="884" y="128" />
</StrongEntitySet>
```

The wrapper element name matches the kind of the referenced definition. Positionable kinds are:
- `<StrongEntitySet>`, `<WeakEntitySet>` — entities.
- All seven `<RelationshipSet…>` / `<IdentifyingRelationshipSet…>` kinds — relationships.
- `<Generalization>`, `<TotalGeneralization>` — ISA hierarchies.
- `<SimpleAttribute>`, `<CompositeAttribute>` — attributes (including composite children).

`<RelationshipSetBranch>` is the only diagrammable construct without a stored position — Java does not persist branch positions.

Document order of the diagram entries varies between Java-produced files; the reader preserves whatever order it sees and the writer emits in that same order so byte-clean round-trip is preserved.

### `<Position>`

Required attributes:
- `x` — integer.
- `y` — integer.

No children. Always self-closing.

## Coordinate system

Center-based: positions in the diagram point to the centre of the bounding box, not the top-left corner. The codec converts to/from React Flow's top-left origin in `src/notation/chen/codecs/javaXml/transformer.ts`:

```typescript
// Java center → React Flow top-left
ourTopLeftX = javaCenterX - (entityWidth / 2)
ourTopLeftY = javaCenterY - (entityHeight / 2)

// React Flow top-left → Java center
javaCenterX = ourTopLeftX + (entityWidth / 2)
javaCenterY = ourTopLeftY + (entityHeight / 2)
```

Both entities and attributes use centre coordinates; the codec applies the same conversion to every positioned element.

## Implementation

- Parser: `src/notation/chen/codecs/javaXml/reader.ts`.
- Serializer: `src/notation/chen/codecs/javaXml/writer.ts`.
- `JavaModel ↔ Diagram` transformer: `src/notation/chen/codecs/javaXml/transformer.ts` and `diagram-to-java.ts`.
- Round-trip test: `src/notation/chen/codecs/javaXml/roundtrip.test.ts`.

## Where to next

- [Concepts: Codecs](../concepts/codecs) — the codec contract in v2.
- [Recipes: Add a codec](../recipes/add-codec).
