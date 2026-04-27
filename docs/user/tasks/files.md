# Files

The editor reads and writes a single file format: **Java ERDesigner XML**. Files round-trip with the legacy desktop tool.

## Save

Open the menu (☰) → **Save**. The editor downloads `er-diagram.xml` to your default download folder. The current diagram is serialized; nothing is uploaded anywhere.

If the canvas is empty, the **Save** menu item is disabled.

## Open

Menu → **Open**. The editor prompts for an `.xml` file from your local filesystem.

If the canvas is **not empty**, you'll see a confirmation dialog: **Replace canvas with this file?** Choose **Replace** to discard the current diagram, or **Cancel** to keep it.

## Reset

Menu → **Reset**. Empties the canvas. Always confirms first (the action is irreversible — there's no undo across reset).

## XML format compatibility

- Files written by ER Editor v2 open in the legacy ERDesigner Java app and vice versa.
- Element / attribute names follow the legacy schema (`<ERDatabaseModel>`, `<StrongEntitySet>`, etc.).
- See [Java XML format reference](../../dev/reference/java-xml-format) for the full schema.

## Embed mode caveat

When the editor is embedded with `?embed=true`, the **Save** and **Open** menu items are hidden — the host application controls file I/O via the [Moodle integration](../moodle).

## Where to next

- [Exporting](./exporting) — PNG, SVG, Mermaid, beyond round-trippable XML.
- [Embedding in Moodle](../moodle) — how a Moodle host loads and stores XML on your behalf.
