# Recipe: add a new codec

We'll add a hypothetical **GraphML** codec for the Chen notation. The recipe shows where a parser/serializer slots in and how to wire it through the Save/Open menu.

## 1. Implement the codec

Create `src/notation/chen/codecs/graphml/index.ts`:

```typescript
import type { Codec, Result } from '../types'
import type { Diagram } from '@/domain/types'
import { parseGraphML } from './reader'
import { serializeGraphML } from './writer'

export const chenGraphMLCodec: Codec = {
  id: 'chen-graphml',
  displayName: 'Chen ER (GraphML)',
  mode: 'both',
  parse: (raw): Result<Diagram> => {
    try {
      return { ok: true, value: parseGraphML(raw) }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error : new Error(String(error)) }
    }
  },
  serialize: (d) => serializeGraphML(d),
}
```

Reader and writer follow the same pattern as the Java XML codec (`src/notation/chen/codecs/javaXml/`). Pure functions, no side effects, no DOM.

## 2. Register in the codec index

```diff
// src/notation/chen/codecs/index.ts
+export { chenGraphMLCodec } from './graphml'
```

## 3. Wire menu actions

```diff
// src/ui/menu/useFileActions.ts
+import { chenGraphMLCodec } from '@/notation/chen/codecs'

 const exportFormats = [
   { id: 'java-xml', codec: chenJavaXmlCodec, ext: 'xml' },
+  { id: 'graphml', codec: chenGraphMLCodec, ext: 'graphml' },
   /* ... */
 ]
```

(The exact wiring depends on the menu's existing pattern. Follow the structure for `chenMermaidCodec` as a reference for serialize-only codecs, or `chenJavaXmlCodec` for both-modes codecs.)

## 4. Tests

- Round-trip: `src/notation/chen/codecs/graphml/round-trip.test.ts`. Use the same pattern as `javaXml/round-trip.test.ts` — parse(serialize(diagram)) === diagram for a fixture.
- Reader: `graphml/reader.test.ts` — parse a hand-written GraphML, assert the resulting diagram.
- Writer: `graphml/writer.test.ts` — serialize a fixture, assert the output is valid GraphML.

## 5. i18n

```diff
// src/platform/i18n/locales/en/menu.json
 "export": {
+  "graphml": "GraphML"
 }
```

(Italian likewise.)

## 6. Verify

```bash
pnpm typecheck && pnpm lint && pnpm test --run
```

Then in the browser: Save / Open round-trips a diagram through `.graphml` files.

## Where to next

- [Concepts: Codecs](../concepts/codecs) — the round-trip contract in detail.
- [Java XML format reference](../reference/java-xml-format) — the reference codec.
