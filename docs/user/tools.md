# Tools tour

The toolbar contains every tool you need for placing nodes and drawing connections. On desktop it sits at the top centre; on tablets and phones it's a vertical rail on the left (collapsible into a single chevron on phones).

![Desktop toolbar with all tool icons](/screenshots/tools-toolbar.png)

## Selection

| Icon | Tool | What it does |
|---|---|---|
| ▶ | **Select** | Click to select a single node. Shift-click to add to selection. Drag on empty canvas to rubberband-select. |
| ✋ | **Pan** | Drag the canvas to scroll. Same effect as holding Space with the Select tool. |

## Placement (drag-and-drop or click-to-place)

| Icon | Tool | What it does |
|---|---|---|
| ▢ | **Entity** | Place a strong entity (rectangle). Drag from the toolbar onto the canvas, or click the toolbar then click the canvas. |
| ◇ | **Relationship** | Place a relationship (diamond). |
| ◯ | **Attribute** | Place an attribute (ellipse). Drag onto an entity to attach it; otherwise leave it standalone and connect later. |

## Connection

| Icon | Tool | What it does |
|---|---|---|
| 🔗 | **Connect** | Pick the first node, then the second. Creates the appropriate connection given the kinds (entity↔relationship, entity→attribute, etc.). Cardinality and participation are set on the relationship's property panel. |
| `1:1` | **Relationship 1:1** | Pick two entities. Creates a relationship with both ends `1`. |
| `1:N` | **Relationship 1:N** | Pick the `1` side then the `N` side. |
| `N:N` | **Relationship N:N** | Pick two entities. Creates a relationship with both ends `N`. |
| ⚭ | **Generalization (ISA)** | Pick the parent (general) entity, then the child (specific). Adds a child if the ISA already exists between the parent and other children. |
| ⚭² | **Generalization (Total)** | Same as Generalization, but the participation is `total` (every parent instance must be one of the children). |

## Pen and touch

- **Single-finger drag** pans the canvas (when not on a node).
- **Long-press (~500 ms)** starts a rubberband selection.
- **Two-finger pinch** zooms; **two-finger drag** pans.
- **Pen** behaves like a mouse: tap to click, drag to move; pressure and tilt are ignored.

## Keyboard shortcuts

See [Keyboard shortcuts](./shortcuts) for the full reference, generated directly from the source-of-truth keybinding registry.
