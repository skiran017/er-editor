# Exporting

Beyond the round-trippable XML format, the editor produces three additional outputs.

## PNG (raster image)

Menu → **Export** → **PNG**. Downloads a PNG snapshot of the current canvas at its current zoom and pan. Good for embedding in reports, slides, Moodle quiz answers.

The export briefly forces light mode (white background) regardless of your theme so the image is readable on any backdrop.

## SVG (vector image)

Menu → **Export** → **SVG**. Downloads a scalable vector. Good for printing and inclusion in LaTeX or vector-aware editors. Same light-mode rasterization rule.

## Mermaid (textual diagram)

Menu → **Export** → **Mermaid**. Downloads a `.mmd` file using Mermaid's ER diagram syntax. Useful for:
- Pasting into Markdown (GitHub, Moodle, GitLab) where Mermaid renders inline.
- Comparing diagrams as text.
- Storing diagrams in version control.

The Mermaid export is **lossy**: cardinality is preserved, but Chen-specific concepts like derived attributes and total-participation double-lines are not represented in Mermaid syntax. Use Mermaid for sharing snapshots; use XML for round-tripping.

## Embed mode caveat

When the editor is embedded with `?embed=true`, the **Export** menu is hidden — Moodle hosts can request the diagram XML via [postMessage](../moodle).

## Where to next

- [Files](./files) — saving and opening the round-trippable XML format.
