# Properties

Selecting any node opens the **property pane** (a side panel on desktop, a slide-up drawer on tablet and phone). What you see depends on what's selected.

## Desktop

![Right-side property pane showing entity properties: name, weak toggle, attributes list](/screenshots/properties-entity.png)

The pane sits on the right and stays open as long as something is selected. Click empty canvas to deselect and close the pane.

## Mobile / tablet

![Bottom drawer with the same content, half-height, dismissable by tapping the backdrop](/screenshots/properties-mobile-drawer.png)

The pane becomes a drawer:
- **Phones:** rises from the bottom, half-screen height. Drag down or tap the backdrop to dismiss.
- **Tablets:** slides in from the right, narrower than desktop.

Dismissing the drawer **does not deselect** — your selection stays so you can drag the nodes you just selected. Re-open the drawer by tapping the selected node again.

## Per-kind properties

### Entity

- **Name** (required, unique).
- **Weak** toggle. Weak entities must connect to an identifying relationship and live on the N-side.
- **Attributes** list — add / remove / reorder. Attributes are first-class nodes; you can also add them via the Attribute tool.

### Relationship

- **Name** (required).
- **Identifying** toggle (only relevant when one side is a weak entity).
- **Branches** — one row per connected entity. Each row sets:
  - **Cardinality:** `1`, `N`, or `M`.
  - **Participation:** `partial` (single line) or `total` (double line).
  - **Role** (optional) — a label rendered next to the line, e.g. `borrower` / `lender`.

### Attribute

- **Name**.
- **Type** flags: `Key`, `Discriminant`, `Multivalued`, `Derived`. (Mutually exclusive where ER theory says so — you can't be both a `Key` and `Derived`.)

### ISA

- **Total participation** toggle (every parent instance is one of the children).
- **Children list** — derived from the diagram structure; not edited here directly.

## Where to next

- [Cardinality & participation](./cardinality) for the relationship branch settings in depth.
- [Validation](./validation) — what the property pane warns you about.
