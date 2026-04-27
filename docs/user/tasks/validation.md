# Validation

The editor checks your diagram against Chen-notation rules and surfaces errors and warnings as red badges on the offending nodes. Hover (or tap) a badge to see the explanation.

![Entity with a red error badge; tooltip says: Entity X has no key — add a key attribute](/screenshots/validation-error-tooltip.png)

## Toggling validation

Open the menu (☰ top-left) → **Validation** → **On / Off**. Off means no badges are shown but the diagram remains as-is — useful when modelling work-in-progress.

In **exam mode** (`?examMode=true` URL flag, or set automatically when `?embed=true`), validation is forced off and the toggle is disabled. Students don't see hints during an exam.

## Common errors

| Message | What it means | How to fix |
|---|---|---|
| Entity X has no key attribute | A strong entity must have at least one attribute marked **Key**. | Add an attribute to X and toggle its **Key** flag, or convert X to a weak entity. |
| Weak entity X must use total participation | Weak entities must totally participate in their identifying relationship. | Edit the branch from the relationship to X and set participation to **Total**. |
| Weak entity X must be on the N-side | Weak entities cannot be on the `1` side of an identifying relationship. | Swap the cardinality, or make X a strong entity. |
| Relationship R must connect at least 2 entities | A relationship is dangling. | Connect R to two or more entities, or delete it. |
| Attribute A is connected to multiple entities | Attributes belong to exactly one entity. | Delete the extra connection. |

## Common warnings

Warnings are softer than errors — your diagram is structurally valid but might not match common ER conventions:

| Message | When |
|---|---|
| Entity X has no attributes | Permitted but unusual; usually a forgotten attribute. |
| Relationship R has no name | Permitted but harder to read. |

## Where to next

- [Chen validation rules reference](../../dev/reference/chen-validation-rules) — the complete rule set with reasoning.
