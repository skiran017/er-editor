# Quick start

You'll build a tiny **Books and Authors** diagram in three steps. Total time: about three minutes.

## 1. Place your first entity

Click the **Entity** tool in the toolbar (the rectangle), then click anywhere on the canvas. A new entity appears. Double-click it to rename — type **Book**, then press Enter.

![Entity tool selected, an entity named Book on the canvas](/screenshots/quick-start-1.png)

## 2. Add a second entity

With the Entity tool still active, click somewhere else on the canvas and rename to **Author**.

![Two entities, Book and Author, on the canvas](/screenshots/quick-start-2.png)

## 3. Connect them

Pick the **Relationship 1:N** tool (the `1:N` icon), click **Author**, then click **Book**. A diamond labelled `writes` appears between them with `1` on the Author side and `N` on the Book side.

![Author and Book connected by a relationship 'writes' with cardinality 1 and N](/screenshots/quick-start-3.png)

That's a valid Chen-notation diagram. To save it, open the menu (☰ top-left) and choose **Save** — the editor downloads an `.xml` file you can open later.

## Where to next

- [Tools tour](./tools) — every toolbar button explained.
- [Building a diagram](./tasks/building) — a worked Library example with attributes, weak entities, and validation.
- [Cardinality & participation](./tasks/cardinality) — the rest of the relationship syntax.
