# Cardinality & participation

A Chen relationship is annotated on each branch (each line connecting it to an entity) with two pieces of information.

## Cardinality

- **`1`** — exactly one. Each side participates with at most one instance.
- **`N`** or **`M`** — many. Each side can participate with zero or more instances. (`N` and `M` mean the same thing; convention varies.)

The most common patterns:

| Pattern | Meaning | Example |
|---|---|---|
| **1:1** | one-to-one | Person ↔ Passport |
| **1:N** | one-to-many | Department ↔ Employee |
| **N:N** | many-to-many | Student ↔ Course |

![A 1:N relationship between Author and Book](/screenshots/cardinality-1n.png)

## Participation

Drawn as the **line style** between the entity and the relationship:

- **Partial** (single line) — instances of the entity may or may not participate.
- **Total** (double line) — every instance of the entity must participate.

> Example: in a `Book — Author` `writes` relationship, total participation on the Book side means every book must have at least one author. Total participation on the Author side means every author has written at least one book.

## Quick-relationship tools

Three toolbar buttons skip the cardinality dialog:

- **`1:1`** — both sides become `1`.
- **`1:N`** — first-clicked side becomes `1`, second becomes `N`.
- **`N:N`** — both sides become `N`.

For anything else (M:N with roles, partial vs total, three-way relationships) use the regular **Relationship** + **Connect** tools and edit branches in the property pane.

## Where to next

- [Validation](./validation) — common cardinality / participation errors and how to fix them.
- [Building a diagram](./building) for a worked example with all of the above.
