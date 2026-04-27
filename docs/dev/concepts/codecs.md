# Codecs

A codec converts between `Diagram` and an external format. The editor ships four codecs for the Chen notation: Java XML, Mermaid, PNG, and SVG.

## The codec interface

```typescript
interface Codec {
  readonly id: string
  readonly displayName: string
  readonly mode: 'parse' | 'serialize' | 'both'
  parse?(raw: string): Result<Diagram>
  serialize?(diagram: Diagram): string
}
```

`Result<T>` is a discriminated union — `{ ok: true, value: T }` or `{ ok: false, error: Error }`. Codecs never throw across the boundary; failures come back as `ok: false`.

## The four Chen codecs

| Codec | id | Mode | Notes |
|---|---|---|---|
| **Java XML** | `chen-java-xml` | `both` | Round-trippable with the legacy ERDesigner Java app. The format the editor's Save/Open uses. See [Java XML format reference](../reference/java-xml-format). |
| **Mermaid** | `chen-mermaid` | `serialize` | Lossy: cardinality preserved, but derived attributes / total participation are not in Mermaid's syntax. |
| **PNG** | `chen-png` | `serialize` | Returns a base64 data URL; the menu kicks off a download. |
| **SVG** | `chen-svg` | `serialize` | Same shape as PNG but vector. |

## Round-trip contract

For codecs in `mode: 'both'` (only Java XML today), the round-trip property holds:

```typescript
const back = codec.parse(codec.serialize(diagram))
expect(back.ok && back.value).toEqual(diagram)
```

This is exercised by `src/notation/chen/codecs/javaXml/round-trip.test.ts`. Adding a new bidirectional codec means adding the same test.

## Adding a new codec

See [Recipes: Add a codec](../recipes/add-codec).

## Where to next

- [Java XML format reference](../reference/java-xml-format).
- [Recipes: Add a codec](../recipes/add-codec).
