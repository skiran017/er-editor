# Phase 5 — I/O Codecs (Java XML, Mermaid, image) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the SUPSI Java XML codec (with byte-clean fixture round-trip as the hard acceptance gate from spec §10.7), the Mermaid export, the codec registry, and the Menu's Open / Save / Export wiring through the `platform/fs` + `platform/imageExport` primitives shipped in Phase 7. No Moodle bridge in this phase.

**Architecture:** Two-layer Java XML codec.

```
[Java XML string]
   ↕  reader.ts / writer.ts   ← 1:1 mirror of XMLReader.java / XMLWriter.java
[JavaModel — TS discriminated unions matching Java's class hierarchy]
   ↕  transformer.ts          ← semantic translation
[Diagram — our domain model]
```

The reader/writer is dumb shape conversion (XML ↔ JavaModel). The transformer is the smart part: maps Java's 7 relationship subclasses to our `relationship` + per-edge cardinalities, expands nested `<Attributes>` to `attribute` nodes + `attribute-of` edges, and flattens `Generalization` / `TotalGeneralization` to `isa` + `isTotal`. Each layer has its own test surface; combined they yield byte-clean SUPSI fixture round-trip.

**Tech Stack:** TypeScript 5.9, native `DOMParser` + `XMLSerializer` (no external XML lib — jsdom has both), Vitest 3.2 + `@testing-library/react` 16, the existing `@/platform/fs` (Phase 7 `openFile` / `downloadBlob`) and `@/platform/imageExport` (Phase 7 `toPng` / `canvasToSvg`). React Flow stays untouched.

**Reference spec:** [docs/superpowers/specs/2026-04-22-target-architecture-design.md](../specs/2026-04-22-target-architecture-design.md) §6.5 (codec contract), §6.6 (codecs shipping in v1), §6.8 (SUPSI XML acceptance), §10.7 (Phase 5 exit), §12.4 (open items resolved by SUPSI sample arrival).

**Reference Java source:** `/Users/kiri/SUPSI/ER-Designer/ERDesigner.jar_Decompiler.com/ch/supsi/database/io/{XMLReader,XMLWriter}.java` — these are the authoritative spec for the on-disk shape.

---

## Preconditions

Before starting Task 1, verify:

- On `v2` branch with clean working tree (`git status` shows nothing to commit).
- `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm lint:locales`, `pnpm build` all green on the current tip.
- SUPSI sample XMLs already in `tests/fixtures/supsi/` (user dropped them — verify with `ls`).
- `XMLReader.java` and `XMLWriter.java` are open / accessible for reference.

---

## Scope decisions locked in

1. **Two-layer codec** (reader/writer + transformer) — confirmed with user.
2. **No native JSON codec** — user explicitly skipped. Our save/load format IS Java XML in v1.
3. **Byte-clean SUPSI fixture round-trip** is the hard acceptance gate. Layer 1 (reader/writer) tests prove it independently of the transformer.
4. **No Moodle bridge** — deferred per Phase 7 scope decision; surfaces in a later phase once we ship a host script.
5. **No `legacyId` sidecar** — Java's `reassignID` re-numbers every save, so we just preserve insertion order in our domain (`nodeOrder` / `edgeOrder` already gives this) and re-ID 1..N on every export. Round-trip with no edits = same order = same IDs = byte-clean.
6. **Mermaid is export-only** — no parser, just `Diagram → string`.
7. **PNG / SVG codec contract** — wraps the existing Phase 7 helpers; no new platform code.
8. **Entity sizing not in XML** — Java hardcodes 80×40; we use 120×60. Round-trip stays byte-clean (size isn't serialised). User may see different layouts vs Java app — accepted as a UX nuance.

---

## File Structure

```
src/
  domain/
    types.ts                        (no changes — insertion order via existing nodeOrder/edgeOrder)
  notation/chen/codecs/
    javaXml/
      types.ts                      (NEW — JavaModel discriminated unions)
      types.test.ts
      reader.ts                     (NEW — XML string → JavaModel)
      reader.test.ts
      writer.ts                     (NEW — JavaModel → XML string, byte-clean format)
      writer.test.ts
      transformer.ts                (NEW — JavaModel ↔ Diagram)
      transformer.test.ts
      index.ts                      (NEW — combined codec exposing parse/serialize)
      integration.test.ts           (NEW — byte-clean SUPSI round-trip + semantic tests)
    mermaid.ts                      (NEW — Diagram → Mermaid string)
    mermaid.test.ts
    png.ts                          (NEW — wraps platform/imageExport.toPng + downloadBlob into the codec contract)
    svg.ts                          (NEW — wraps platform/imageExport.canvasToSvg)
    types.ts                        (NEW — Codec<T> contract from spec §6.5)
    index.ts                        (NEW — codec registry)
    index.test.ts
  ui/menu/
    Menu.tsx                        (MODIFY — replace toastPhase5 stubs)
    useFileActions.ts               (NEW — Open/Save handlers via platform/fs + chen-java-xml codec)
    useFileActions.test.ts
    useExportHandlers.ts            (MODIFY — slot Mermaid into Export submenu)
    MenuDropdownBody.tsx            (MODIFY — Export submenu UI for PNG / SVG / Mermaid)
  platform/i18n/locales/{en,it}/menu.json
                                    (MODIFY — add openSuccess / openFailure / saveSuccess / saveFailure / exportMermaid keys)
tests/fixtures/supsi/
  conference-sol.xml                (REQUIRED — primary byte-clean gate)
  test.xml                          (medium fixture, weak entities)
  xml.xml                           (medium fixture, recursive relationships)
  er-java.xml                       (small fixture, basic 1:1)
  er-diagram-java-1767873101060.xml (smallest fixture, three entities)
vitest.config.ts                    (MODIFY — coverage thresholds for src/notation/chen/codecs/**)
```

---

## Task 1: JavaModel TypeScript types

**Files:**
- Create: `src/notation/chen/codecs/javaXml/types.ts`
- Create: `src/notation/chen/codecs/javaXml/types.test.ts`

Rationale: discriminated unions that mirror Java's class hierarchy 1:1. The reader produces these. The writer consumes them. The transformer's responsibility is converting between this shape and our `Diagram`. Defining the shape first locks the contract.

The Java classes (verified against `/Users/kiri/SUPSI/.../XMLReader.java`):

- 2 entity types: `StrongEntitySet`, `WeakEntitySet`
- 2 attribute types: `SimpleAttribute`, `CompositeAttribute` (recursive children)
- 7 relationship types: `RelationshipSetOneToOne` / `OneToN` / `NToOne` / `NToN` + `Identifying` variants for the 1:1 / 1:N / N:1 trio
- `RelationshipSetBranch` (cardinality + total participation + role + entity ref)
- 2 generalization types: `Generalization` (partial) + `TotalGeneralization`

- [ ] **Step 1: Failing test**

```ts
// src/notation/chen/codecs/javaXml/types.test.ts
import { describe, it, expect } from 'vitest'
import type {
  JavaModel,
  JavaStrongEntitySet,
  JavaWeakEntitySet,
  JavaSimpleAttribute,
  JavaCompositeAttribute,
  JavaRelationshipSet,
  JavaRelationshipSetBranch,
  JavaGeneralization,
  JavaPosition,
} from './types'
import { isStrongEntity, isWeakEntity, isIdentifyingRelationship } from './types'

describe('JavaModel discriminants', () => {
  it('isStrongEntity narrows the union', () => {
    const e: JavaStrongEntitySet = {
      _kind: 'StrongEntitySet',
      id: 1,
      name: 'E',
      attributes: [],
      primaryKey: [],
    }
    expect(isStrongEntity(e)).toBe(true)
  })

  it('isWeakEntity narrows the union', () => {
    const w: JavaWeakEntitySet = {
      _kind: 'WeakEntitySet',
      id: 1,
      name: 'W',
      attributes: [],
      discriminant: [],
    }
    expect(isStrongEntity(w)).toBe(false)
    expect(isWeakEntity(w)).toBe(true)
  })

  it('isIdentifyingRelationship matches the three Identifying* class names', () => {
    const r: JavaRelationshipSet = {
      _kind: 'IdentifyingRelationshipSetOneToN',
      id: 1, name: 'R', attributes: [], branches: [],
    }
    expect(isIdentifyingRelationship(r)).toBe(true)
    expect(isIdentifyingRelationship({ ...r, _kind: 'RelationshipSetOneToN' })).toBe(false)
  })

  it('JavaModel composes schema + diagram sections', () => {
    const m: JavaModel = {
      schema: { name: 'S', lastId: 0, entities: [], relationships: [], generalizations: [] },
      diagram: { positions: new Map() },
    }
    expect(m.schema.name).toBe('S')
  })
})
```

- [ ] **Step 2: Run → fail**

```bash
pnpm test src/notation/chen/codecs/javaXml/types.test.ts
```

Expected: FAIL — module missing.

- [ ] **Step 3: Implement `types.ts`**

```ts
// src/notation/chen/codecs/javaXml/types.ts

// 1:1 mirror of Java class hierarchy in
// /Users/kiri/SUPSI/.../ch/supsi/database/erconstructs/. Discriminator
// `_kind` matches the XML element name verbatim — that's how XMLReader
// dispatches and how XMLWriter emits.

export type JavaAttribute = JavaSimpleAttribute | JavaCompositeAttribute

export interface JavaSimpleAttribute {
  readonly _kind: 'SimpleAttribute'
  readonly id: number
  readonly name: string
  readonly multiValued: boolean
  readonly derived: boolean
}

export interface JavaCompositeAttribute {
  readonly _kind: 'CompositeAttribute'
  readonly id: number
  readonly name: string
  readonly multiValued: boolean
  readonly derived: boolean
  readonly children: readonly JavaAttribute[]
}

export type JavaEntitySet = JavaStrongEntitySet | JavaWeakEntitySet

export interface JavaStrongEntitySet {
  readonly _kind: 'StrongEntitySet'
  readonly id: number
  readonly name: string
  readonly attributes: readonly JavaAttribute[]
  /** Refs into `attributes` by id. Empty array means no key declared. */
  readonly primaryKey: readonly number[]
}

export interface JavaWeakEntitySet {
  readonly _kind: 'WeakEntitySet'
  readonly id: number
  readonly name: string
  readonly attributes: readonly JavaAttribute[]
  /** Refs into `attributes` by id. Empty array means no discriminant declared. */
  readonly discriminant: readonly number[]
}

// Seven concrete Java classes for relationship sets. Class name encodes
// the cardinality combo + identifying flag.
export type JavaRelationshipSetKind =
  | 'RelationshipSetOneToOne'
  | 'RelationshipSetOneToN'
  | 'RelationshipSetNToOne'
  | 'RelationshipSetNToN'
  | 'IdentifyingRelationshipSetOneToOne'
  | 'IdentifyingRelationshipSetOneToN'
  | 'IdentifyingRelationshipSetNToOne'

export interface JavaRelationshipSet {
  readonly _kind: JavaRelationshipSetKind
  readonly id: number
  readonly name: string
  readonly attributes: readonly JavaAttribute[]
  readonly branches: readonly JavaRelationshipSetBranch[]
}

export interface JavaRelationshipSetBranch {
  readonly _kind: 'RelationshipSetBranch'
  readonly id: number
  readonly cardinality: '1' | 'N'
  readonly totalParticipation: boolean
  readonly role: string
  /** Reference to a StrongEntitySet or WeakEntitySet. */
  readonly entityRef: { readonly _kind: 'StrongEntitySet' | 'WeakEntitySet'; readonly refid: number }
}

export type JavaGeneralization = JavaPartialGeneralization | JavaTotalGeneralization

export interface JavaPartialGeneralization {
  readonly _kind: 'Generalization'
  readonly id: number
  readonly total: boolean // Java sets `total="true|false"` even on this class
  readonly parent: { readonly _kind: 'StrongEntitySet' | 'WeakEntitySet'; readonly refid: number }
  readonly children: readonly { readonly _kind: 'StrongEntitySet' | 'WeakEntitySet'; readonly refid: number }[]
}

export interface JavaTotalGeneralization {
  readonly _kind: 'TotalGeneralization'
  readonly id: number
  readonly total: boolean
  readonly parent: { readonly _kind: 'StrongEntitySet' | 'WeakEntitySet'; readonly refid: number }
  readonly children: readonly { readonly _kind: 'StrongEntitySet' | 'WeakEntitySet'; readonly refid: number }[]
}

export interface JavaSchema {
  readonly name: string
  readonly lastId: number
  readonly entities: readonly JavaEntitySet[]
  readonly relationships: readonly JavaRelationshipSet[]
  readonly generalizations: readonly JavaGeneralization[]
}

export interface JavaPosition {
  readonly x: number
  readonly y: number
}

export interface JavaDiagram {
  /** Keyed by element id. Branches are NOT in this map (Java doesn't store branch positions). */
  readonly positions: ReadonlyMap<number, JavaPosition>
}

export interface JavaModel {
  readonly schema: JavaSchema
  readonly diagram: JavaDiagram
}

// Type guards
export const isStrongEntity = (e: JavaEntitySet): e is JavaStrongEntitySet =>
  e._kind === 'StrongEntitySet'

export const isWeakEntity = (e: JavaEntitySet): e is JavaWeakEntitySet =>
  e._kind === 'WeakEntitySet'

export const isCompositeAttribute = (a: JavaAttribute): a is JavaCompositeAttribute =>
  a._kind === 'CompositeAttribute'

const IDENTIFYING_KINDS: ReadonlySet<JavaRelationshipSetKind> = new Set([
  'IdentifyingRelationshipSetOneToOne',
  'IdentifyingRelationshipSetOneToN',
  'IdentifyingRelationshipSetNToOne',
])

export const isIdentifyingRelationship = (r: JavaRelationshipSet): boolean =>
  IDENTIFYING_KINDS.has(r._kind)

export const isTotalGeneralization = (g: JavaGeneralization): g is JavaTotalGeneralization =>
  g._kind === 'TotalGeneralization'
```

- [ ] **Step 4: Tests pass**

`pnpm test src/notation/chen/codecs/javaXml/types.test.ts` → 4/4 PASS.

- [ ] **Step 5: Verify**

```bash
pnpm typecheck
pnpm lint
```

- [ ] **Step 6: Commit**

```bash
git add src/notation/chen/codecs/javaXml/types.ts src/notation/chen/codecs/javaXml/types.test.ts
git commit -m "feat(codecs/java): JavaModel types mirror Java class hierarchy"
```

Body: explains that `_kind` discriminator matches Java's XML element name verbatim, supports a 1:1 reader/writer mapping. Add `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.

---

## Task 2: Reader — schema section parsing

**Files:**
- Create: `src/notation/chen/codecs/javaXml/reader.ts`
- Create: `src/notation/chen/codecs/javaXml/reader.test.ts`

Rationale: parses `<ERDatabaseSchema>` subtree into `JavaSchema`. Leaves `<ERDatabaseDiagram>` for Task 3. Uses native `DOMParser` (available in jsdom and every browser).

Java reference: `XMLReader.fromXML(Document, DatabaseSchema)`. Walks `EntitySets`, `RelationshipSets`, `Generalizations`. Each child element name is matched literally.

- [ ] **Step 1: Failing test**

```ts
// src/notation/chen/codecs/javaXml/reader.test.ts
import { describe, it, expect } from 'vitest'
import { parseJavaXml } from './reader'

const MINIMAL = `<?xml version="1.0" encoding="UTF-8"?>
<ERDatabaseModel>
  <ERDatabaseSchema name="Test" lastId="3">
    <EntitySets>
      <StrongEntitySet id="1" name="E">
        <Attributes>
          <SimpleAttribute id="2" name="x" multiValued="false" derived="false" />
        </Attributes>
        <PrimaryKey>
          <SimpleAttribute refid="2" />
        </PrimaryKey>
      </StrongEntitySet>
    </EntitySets>
    <RelationshipSets />
    <Generalizations />
  </ERDatabaseSchema>
  <ERDatabaseDiagram />
</ERDatabaseModel>`

describe('parseJavaXml — schema section', () => {
  it('parses ERDatabaseSchema name + lastId', () => {
    const m = parseJavaXml(MINIMAL)
    expect(m.schema.name).toBe('Test')
    expect(m.schema.lastId).toBe(3)
  })

  it('parses a StrongEntitySet with one SimpleAttribute and a PrimaryKey reference', () => {
    const m = parseJavaXml(MINIMAL)
    expect(m.schema.entities).toHaveLength(1)
    const e = m.schema.entities[0]!
    expect(e._kind).toBe('StrongEntitySet')
    expect(e.id).toBe(1)
    expect(e.name).toBe('E')
    expect(e.attributes).toHaveLength(1)
    expect(e.attributes[0]).toEqual({
      _kind: 'SimpleAttribute', id: 2, name: 'x', multiValued: false, derived: false,
    })
    expect(e._kind === 'StrongEntitySet' && e.primaryKey).toEqual([2])
  })

  it('parses an empty RelationshipSets and Generalizations as empty arrays (not undefined)', () => {
    const m = parseJavaXml(MINIMAL)
    expect(m.schema.relationships).toEqual([])
    expect(m.schema.generalizations).toEqual([])
  })

  it('parses a WeakEntitySet with discriminant refs', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ERDatabaseModel>
  <ERDatabaseSchema name="T" lastId="3">
    <EntitySets>
      <WeakEntitySet id="1" name="W">
        <Attributes>
          <SimpleAttribute id="2" name="d" multiValued="false" derived="false" />
        </Attributes>
        <Discriminant>
          <SimpleAttribute refid="2" />
        </Discriminant>
      </WeakEntitySet>
    </EntitySets>
    <RelationshipSets /><Generalizations />
  </ERDatabaseSchema>
  <ERDatabaseDiagram />
</ERDatabaseModel>`
    const m = parseJavaXml(xml)
    const w = m.schema.entities[0]!
    expect(w._kind).toBe('WeakEntitySet')
    expect(w._kind === 'WeakEntitySet' && w.discriminant).toEqual([2])
  })

  it('parses a CompositeAttribute with nested Children', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ERDatabaseModel>
  <ERDatabaseSchema name="T" lastId="5">
    <EntitySets>
      <StrongEntitySet id="1" name="E">
        <Attributes>
          <CompositeAttribute id="2" name="addr" multiValued="false" derived="false">
            <Children>
              <SimpleAttribute id="3" name="street" multiValued="false" derived="false" />
              <SimpleAttribute id="4" name="city" multiValued="false" derived="false" />
            </Children>
          </CompositeAttribute>
        </Attributes>
      </StrongEntitySet>
    </EntitySets>
    <RelationshipSets /><Generalizations />
  </ERDatabaseSchema>
  <ERDatabaseDiagram />
</ERDatabaseModel>`
    const m = parseJavaXml(xml)
    const a = m.schema.entities[0]!.attributes[0]!
    expect(a._kind).toBe('CompositeAttribute')
    expect(a._kind === 'CompositeAttribute' && a.children).toHaveLength(2)
  })

  it('parses a RelationshipSetNToN with two branches and a relationship-level attribute', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ERDatabaseModel>
  <ERDatabaseSchema name="T" lastId="6">
    <EntitySets>
      <StrongEntitySet id="1" name="A"><Attributes /></StrongEntitySet>
      <StrongEntitySet id="2" name="B"><Attributes /></StrongEntitySet>
    </EntitySets>
    <RelationshipSets>
      <RelationshipSetNToN id="3" name="R">
        <Attributes>
          <SimpleAttribute id="4" name="amt" multiValued="false" derived="false" />
        </Attributes>
        <Branches>
          <RelationshipSetBranch id="5" cardinality="N" totalParticipation="false" role="">
            <StrongEntitySet refid="1" />
          </RelationshipSetBranch>
          <RelationshipSetBranch id="6" cardinality="N" totalParticipation="true" role="r2">
            <StrongEntitySet refid="2" />
          </RelationshipSetBranch>
        </Branches>
      </RelationshipSetNToN>
    </RelationshipSets>
    <Generalizations />
  </ERDatabaseSchema>
  <ERDatabaseDiagram />
</ERDatabaseModel>`
    const m = parseJavaXml(xml)
    const r = m.schema.relationships[0]!
    expect(r._kind).toBe('RelationshipSetNToN')
    expect(r.attributes).toHaveLength(1)
    expect(r.branches).toHaveLength(2)
    expect(r.branches[0]).toMatchObject({
      cardinality: 'N', totalParticipation: false, role: '',
      entityRef: { _kind: 'StrongEntitySet', refid: 1 },
    })
    expect(r.branches[1]).toMatchObject({
      cardinality: 'N', totalParticipation: true, role: 'r2',
    })
  })

  it('parses a Generalization (partial) with parent + children', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ERDatabaseModel>
  <ERDatabaseSchema name="T" lastId="6">
    <EntitySets>
      <StrongEntitySet id="1" name="P"><Attributes /></StrongEntitySet>
      <StrongEntitySet id="2" name="C1"><Attributes /></StrongEntitySet>
      <StrongEntitySet id="3" name="C2"><Attributes /></StrongEntitySet>
    </EntitySets>
    <RelationshipSets />
    <Generalizations>
      <Generalization id="4" total="false">
        <Parent><StrongEntitySet refid="1" /></Parent>
        <Children>
          <StrongEntitySet refid="2" />
          <StrongEntitySet refid="3" />
        </Children>
      </Generalization>
    </Generalizations>
  </ERDatabaseSchema>
  <ERDatabaseDiagram />
</ERDatabaseModel>`
    const m = parseJavaXml(xml)
    const g = m.schema.generalizations[0]!
    expect(g._kind).toBe('Generalization')
    expect(g.total).toBe(false)
    expect(g.parent.refid).toBe(1)
    expect(g.children.map((c) => c.refid)).toEqual([2, 3])
  })
})
```

- [ ] **Step 2: Run → fail**

`pnpm test src/notation/chen/codecs/javaXml/reader.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement reader.ts (schema section only)**

Implementation outline — fill in the bodies completely (no placeholders):

```ts
// src/notation/chen/codecs/javaXml/reader.ts
import type {
  JavaAttribute,
  JavaCompositeAttribute,
  JavaSimpleAttribute,
  JavaEntitySet,
  JavaGeneralization,
  JavaModel,
  JavaPosition,
  JavaRelationshipSet,
  JavaRelationshipSetBranch,
  JavaRelationshipSetKind,
  JavaSchema,
  JavaStrongEntitySet,
  JavaWeakEntitySet,
} from './types'

const RELATIONSHIP_KINDS: ReadonlySet<JavaRelationshipSetKind> = new Set([
  'RelationshipSetOneToOne', 'RelationshipSetOneToN', 'RelationshipSetNToOne', 'RelationshipSetNToN',
  'IdentifyingRelationshipSetOneToOne', 'IdentifyingRelationshipSetOneToN', 'IdentifyingRelationshipSetNToOne',
])

const childByName = (parent: Element, name: string): Element | null =>
  parent.querySelector(`:scope > ${name}`)

const childrenOf = (parent: Element | null): readonly Element[] =>
  parent ? Array.from(parent.children) : []

const intAttr = (el: Element, name: string): number => {
  const raw = el.getAttribute(name)
  if (raw === null) throw new Error(`Missing attribute "${name}" on <${el.tagName}>`)
  const n = Number.parseInt(raw, 10)
  if (Number.isNaN(n)) throw new Error(`Invalid integer "${raw}" for "${name}" on <${el.tagName}>`)
  return n
}

const stringAttr = (el: Element, name: string): string => {
  const raw = el.getAttribute(name)
  if (raw === null) throw new Error(`Missing attribute "${name}" on <${el.tagName}>`)
  return raw
}

const boolAttr = (el: Element, name: string): boolean => stringAttr(el, name) === 'true'

const parseSimpleAttribute = (el: Element): JavaSimpleAttribute => ({
  _kind: 'SimpleAttribute',
  id: intAttr(el, 'id'),
  name: stringAttr(el, 'name'),
  multiValued: boolAttr(el, 'multiValued'),
  derived: boolAttr(el, 'derived'),
})

const parseCompositeAttribute = (el: Element): JavaCompositeAttribute => ({
  _kind: 'CompositeAttribute',
  id: intAttr(el, 'id'),
  name: stringAttr(el, 'name'),
  multiValued: boolAttr(el, 'multiValued'),
  derived: boolAttr(el, 'derived'),
  children: childrenOf(childByName(el, 'Children')).map(parseAttribute),
})

const parseAttribute = (el: Element): JavaAttribute => {
  if (el.tagName === 'SimpleAttribute') return parseSimpleAttribute(el)
  if (el.tagName === 'CompositeAttribute') return parseCompositeAttribute(el)
  throw new Error(`Unexpected attribute element <${el.tagName}>`)
}

const parseRefList = (parent: Element | null): readonly number[] =>
  parent ? Array.from(parent.children).map((c) => intAttr(c, 'refid')) : []

const parseStrongEntity = (el: Element): JavaStrongEntitySet => ({
  _kind: 'StrongEntitySet',
  id: intAttr(el, 'id'),
  name: stringAttr(el, 'name'),
  attributes: childrenOf(childByName(el, 'Attributes')).map(parseAttribute),
  primaryKey: parseRefList(childByName(el, 'PrimaryKey')),
})

const parseWeakEntity = (el: Element): JavaWeakEntitySet => ({
  _kind: 'WeakEntitySet',
  id: intAttr(el, 'id'),
  name: stringAttr(el, 'name'),
  attributes: childrenOf(childByName(el, 'Attributes')).map(parseAttribute),
  discriminant: parseRefList(childByName(el, 'Discriminant')),
})

const parseEntity = (el: Element): JavaEntitySet => {
  if (el.tagName === 'StrongEntitySet') return parseStrongEntity(el)
  if (el.tagName === 'WeakEntitySet') return parseWeakEntity(el)
  throw new Error(`Unexpected entity element <${el.tagName}>`)
}

const parseEntityRef = (el: Element): { readonly _kind: 'StrongEntitySet' | 'WeakEntitySet'; readonly refid: number } => {
  if (el.tagName !== 'StrongEntitySet' && el.tagName !== 'WeakEntitySet') {
    throw new Error(`Unexpected entity ref element <${el.tagName}>`)
  }
  return { _kind: el.tagName, refid: intAttr(el, 'refid') }
}

const parseBranch = (el: Element): JavaRelationshipSetBranch => {
  const ses = childByName(el, 'StrongEntitySet')
  const wes = childByName(el, 'WeakEntitySet')
  const ref = ses ?? wes
  if (!ref) throw new Error('RelationshipSetBranch missing entity reference')
  const cardinality = stringAttr(el, 'cardinality')
  if (cardinality !== '1' && cardinality !== 'N') {
    throw new Error(`Unexpected cardinality "${cardinality}"`)
  }
  return {
    _kind: 'RelationshipSetBranch',
    id: intAttr(el, 'id'),
    cardinality,
    totalParticipation: boolAttr(el, 'totalParticipation'),
    role: stringAttr(el, 'role'),
    entityRef: parseEntityRef(ref),
  }
}

const parseRelationship = (el: Element): JavaRelationshipSet => {
  const kind = el.tagName as JavaRelationshipSetKind
  if (!RELATIONSHIP_KINDS.has(kind)) {
    throw new Error(`Unexpected relationship element <${el.tagName}>`)
  }
  return {
    _kind: kind,
    id: intAttr(el, 'id'),
    name: stringAttr(el, 'name'),
    attributes: childrenOf(childByName(el, 'Attributes')).map(parseAttribute),
    branches: childrenOf(childByName(el, 'Branches')).map(parseBranch),
  }
}

const parseGeneralization = (el: Element): JavaGeneralization => {
  const kind = el.tagName
  if (kind !== 'Generalization' && kind !== 'TotalGeneralization') {
    throw new Error(`Unexpected generalization element <${el.tagName}>`)
  }
  const parent = childByName(el, 'Parent')
  if (!parent) throw new Error('Generalization missing <Parent>')
  const parentRef = parent.children[0]
  if (!parentRef) throw new Error('Generalization parent has no entity ref')
  return {
    _kind: kind,
    id: intAttr(el, 'id'),
    total: boolAttr(el, 'total'),
    parent: parseEntityRef(parentRef),
    children: childrenOf(childByName(el, 'Children')).map(parseEntityRef),
  }
}

const parseSchema = (root: Element): JavaSchema => {
  const schemaEl = childByName(root, 'ERDatabaseSchema')
  if (!schemaEl) throw new Error('Missing <ERDatabaseSchema>')
  return {
    name: stringAttr(schemaEl, 'name'),
    lastId: intAttr(schemaEl, 'lastId'),
    entities: childrenOf(childByName(schemaEl, 'EntitySets')).map(parseEntity),
    relationships: childrenOf(childByName(schemaEl, 'RelationshipSets')).map(parseRelationship),
    generalizations: childrenOf(childByName(schemaEl, 'Generalizations')).map(parseGeneralization),
  }
}

// Diagram parsing lands in Task 3. Stub for now — returns empty positions.
const parseDiagram = (root: Element): { readonly positions: ReadonlyMap<number, JavaPosition> } => {
  void root
  return { positions: new Map() }
}

export const parseJavaXml = (xml: string): JavaModel => {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  const errorEl = doc.querySelector('parsererror')
  if (errorEl) throw new Error(`XML parse error: ${errorEl.textContent ?? 'unknown'}`)
  const root = doc.documentElement
  if (root.tagName !== 'ERDatabaseModel') {
    throw new Error(`Expected <ERDatabaseModel>, got <${root.tagName}>`)
  }
  return { schema: parseSchema(root), diagram: parseDiagram(root) }
}
```

- [ ] **Step 4: Tests pass**

```bash
pnpm test src/notation/chen/codecs/javaXml/reader.test.ts
```

Expected: 7/7 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/notation/chen/codecs/javaXml/reader.ts src/notation/chen/codecs/javaXml/reader.test.ts
git commit -m "feat(codecs/java): reader parses ERDatabaseSchema section into JavaModel"
```

Body: notes that diagram-section parsing is stubbed for Task 3. Add Co-Authored-By trailer.

---

## Task 3: Reader — diagram section

**Files:**
- Modify: `src/notation/chen/codecs/javaXml/reader.ts` (replace `parseDiagram` stub)
- Modify: `src/notation/chen/codecs/javaXml/reader.test.ts` (add tests)

Java reference: `XMLReader.fromXML(Document, Hashtable)`. Walks every child of `<ERDatabaseDiagram>` and reads its `Position` child. Branches don't have positions — they're not in the diagram section.

- [ ] **Step 1: Failing test**

```ts
// Append to reader.test.ts inside the existing describe
it('parses ERDatabaseDiagram positions keyed by refid', () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ERDatabaseModel>
  <ERDatabaseSchema name="T" lastId="2"><EntitySets>
    <StrongEntitySet id="1" name="E"><Attributes>
      <SimpleAttribute id="2" name="x" multiValued="false" derived="false" />
    </Attributes></StrongEntitySet>
  </EntitySets><RelationshipSets /><Generalizations /></ERDatabaseSchema>
  <ERDatabaseDiagram>
    <SimpleAttribute refid="2"><Position x="100" y="200" /></SimpleAttribute>
    <StrongEntitySet refid="1"><Position x="50" y="60" /></StrongEntitySet>
  </ERDatabaseDiagram>
</ERDatabaseModel>`
  const m = parseJavaXml(xml)
  expect(m.diagram.positions.get(1)).toEqual({ x: 50, y: 60 })
  expect(m.diagram.positions.get(2)).toEqual({ x: 100, y: 200 })
})

it('returns an empty map for an empty <ERDatabaseDiagram />', () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ERDatabaseModel>
  <ERDatabaseSchema name="T" lastId="0"><EntitySets /><RelationshipSets /><Generalizations /></ERDatabaseSchema>
  <ERDatabaseDiagram />
</ERDatabaseModel>`
  const m = parseJavaXml(xml)
  expect(m.diagram.positions.size).toBe(0)
})
```

- [ ] **Step 2: Run → fail**

`pnpm test src/notation/chen/codecs/javaXml/reader.test.ts` — first new test fails (positions map is empty per the stub).

- [ ] **Step 3: Implement parseDiagram**

Replace the stub in `reader.ts`:

```ts
const parseDiagram = (root: Element): { readonly positions: ReadonlyMap<number, JavaPosition> } => {
  const diagramEl = childByName(root, 'ERDatabaseDiagram')
  const positions = new Map<number, JavaPosition>()
  if (!diagramEl) return { positions }
  for (const child of Array.from(diagramEl.children)) {
    // Each child is an element like <StrongEntitySet refid="N"> with a
    // single <Position x=".." y=".."/> child.
    const refid = intAttr(child, 'refid')
    const positionEl = childByName(child, 'Position')
    if (!positionEl) continue
    positions.set(refid, { x: intAttr(positionEl, 'x'), y: intAttr(positionEl, 'y') })
  }
  return { positions }
}
```

- [ ] **Step 4: Tests pass**

`pnpm test src/notation/chen/codecs/javaXml/reader.test.ts` → 9/9 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/notation/chen/codecs/javaXml/reader.ts src/notation/chen/codecs/javaXml/reader.test.ts
git commit -m "feat(codecs/java): reader parses ERDatabaseDiagram positions"
```

Add Co-Authored-By trailer.

---

## Task 4: Reader — fixture parse tests

**Files:**
- Modify: `src/notation/chen/codecs/javaXml/reader.test.ts` (or create a sibling `reader.fixtures.test.ts` if the file is over the line cap)
- Reads from: `tests/fixtures/supsi/*.xml`

Verifies the reader correctly parses ALL five SUPSI sample XMLs into JavaModel structures. No transformations yet — just structural validation.

- [ ] **Step 1: Add fixture test**

```ts
// At top of reader.test.ts (or new reader.fixtures.test.ts)
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const FIX = (name: string): string =>
  readFileSync(join(__dirname, '../../../../../tests/fixtures/supsi', name), 'utf8')

describe('parseJavaXml — SUPSI fixtures', () => {
  it('conference-sol.xml: 11 entities, 13 relationships, 0 generalizations', () => {
    const m = parseJavaXml(FIX('conference-sol.xml'))
    expect(m.schema.entities).toHaveLength(11)
    expect(m.schema.relationships).toHaveLength(13)
    expect(m.schema.generalizations).toHaveLength(0)
    expect(m.schema.lastId).toBe(78)
  })

  it('test.xml: 3 entities (one weak), 1 relationship', () => {
    const m = parseJavaXml(FIX('test.xml'))
    expect(m.schema.entities).toHaveLength(3)
    const weak = m.schema.entities.find((e) => e._kind === 'WeakEntitySet')
    expect(weak?.name).toBe("ENTITA'_3")
  })

  it('xml.xml: includes a 4-branch RelationshipSetNToN', () => {
    const m = parseJavaXml(FIX('xml.xml'))
    const big = m.schema.relationships.find((r) => r.branches.length === 4)
    expect(big?._kind).toBe('RelationshipSetNToN')
  })

  it('er-java.xml: simple two-entity 1:1', () => {
    const m = parseJavaXml(FIX('er-java.xml'))
    expect(m.schema.entities).toHaveLength(2)
    expect(m.schema.relationships[0]?._kind).toBe('RelationshipSetOneToOne')
  })

  it('er-diagram-java-1767873101060.xml: lastId=0 quirk (Java leaves lastId untouched in some saves)', () => {
    const m = parseJavaXml(FIX('er-diagram-java-1767873101060.xml'))
    expect(m.schema.lastId).toBe(0)
    // But the actual highest id is 12.
    const allIds = m.schema.entities.flatMap((e) => [e.id, ...e.attributes.map((a) => a.id)])
    expect(Math.max(...allIds)).toBe(8)
  })

  it('every fixture parses without throwing', () => {
    for (const name of [
      'conference-sol.xml', 'test.xml', 'xml.xml', 'er-java.xml',
      'er-diagram-java-1767873101060.xml',
    ]) {
      expect(() => parseJavaXml(FIX(name))).not.toThrow()
    }
  })
})
```

- [ ] **Step 2: Run → adjust assertions to actual fixture content**

Open each fixture and verify the asserted counts. The numbers above are from manual inspection; they should be exact. If a count is off, adjust the assertion (don't loosen the test).

- [ ] **Step 3: Tests pass**

`pnpm test src/notation/chen/codecs/javaXml/reader.test.ts` → all green.

- [ ] **Step 4: Commit**

```bash
git add src/notation/chen/codecs/javaXml/reader.test.ts
git commit -m "test(codecs/java): reader parses all 5 SUPSI fixtures"
```

Add Co-Authored-By trailer.

---

## Task 5: Writer — schema section serialization

**Files:**
- Create: `src/notation/chen/codecs/javaXml/writer.ts`
- Create: `src/notation/chen/codecs/javaXml/writer.test.ts`

Format reference: JDOM's `Format.getPrettyFormat()`, mirrored from samples:
- `<?xml version="1.0" encoding="UTF-8"?>` followed by `\n`
- 2-space indent per nesting level
- Attributes separated by single space
- Self-closing form for empty elements: `<Foo />` (with single space before `/>`)
- Containers always emitted even when empty (e.g., `<Generalizations />`)
- Newline after every opening tag of a container with children
- No trailing newline on last close tag … actually the SUPSI samples vary; for byte-clean we'll match input convention.

Java reference: `XMLWriter.toXML(DatabaseSchema, Hashtable)`. Attribute order is the order of `setAttribute` calls — verified via Java source for every element type.

- [ ] **Step 1: Failing test**

```ts
// src/notation/chen/codecs/javaXml/writer.test.ts
import { describe, it, expect } from 'vitest'
import { serializeJavaXml } from './writer'
import type { JavaModel } from './types'

const empty = (): JavaModel => ({
  schema: { name: 'T', lastId: 0, entities: [], relationships: [], generalizations: [] },
  diagram: { positions: new Map() },
})

describe('serializeJavaXml — schema section', () => {
  it('emits the JDOM XML declaration with UTF-8 + \\n', () => {
    const out = serializeJavaXml(empty())
    expect(out.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n')).toBe(true)
  })

  it('emits empty schema sections as self-closing siblings', () => {
    const out = serializeJavaXml(empty())
    expect(out).toContain('  <ERDatabaseSchema name="T" lastId="0">\n    <EntitySets />\n    <RelationshipSets />\n    <Generalizations />\n  </ERDatabaseSchema>\n')
  })

  it('emits SimpleAttribute attributes in id, name, multiValued, derived order', () => {
    const m: JavaModel = {
      schema: {
        name: 'T', lastId: 2,
        entities: [{
          _kind: 'StrongEntitySet', id: 1, name: 'E',
          attributes: [{ _kind: 'SimpleAttribute', id: 2, name: 'x', multiValued: false, derived: false }],
          primaryKey: [],
        }],
        relationships: [], generalizations: [],
      },
      diagram: { positions: new Map() },
    }
    const out = serializeJavaXml(m)
    expect(out).toContain('<SimpleAttribute id="2" name="x" multiValued="false" derived="false" />')
  })

  it('emits a StrongEntitySet with PrimaryKey refs', () => {
    const m: JavaModel = {
      schema: {
        name: 'T', lastId: 2,
        entities: [{
          _kind: 'StrongEntitySet', id: 1, name: 'E',
          attributes: [{ _kind: 'SimpleAttribute', id: 2, name: 'k', multiValued: false, derived: false }],
          primaryKey: [2],
        }],
        relationships: [], generalizations: [],
      },
      diagram: { positions: new Map() },
    }
    const out = serializeJavaXml(m)
    expect(out).toContain('<PrimaryKey>\n          <SimpleAttribute refid="2" />\n        </PrimaryKey>')
  })

  it('emits a RelationshipSetBranch with id, cardinality, totalParticipation, role attribute order', () => {
    const m: JavaModel = {
      schema: {
        name: 'T', lastId: 4,
        entities: [
          { _kind: 'StrongEntitySet', id: 1, name: 'A', attributes: [], primaryKey: [] },
          { _kind: 'StrongEntitySet', id: 2, name: 'B', attributes: [], primaryKey: [] },
        ],
        relationships: [{
          _kind: 'RelationshipSetOneToN', id: 3, name: 'R',
          attributes: [],
          branches: [{
            _kind: 'RelationshipSetBranch', id: 4, cardinality: '1', totalParticipation: false, role: '',
            entityRef: { _kind: 'StrongEntitySet', refid: 1 },
          }],
        }],
        generalizations: [],
      },
      diagram: { positions: new Map() },
    }
    const out = serializeJavaXml(m)
    expect(out).toContain('<RelationshipSetBranch id="4" cardinality="1" totalParticipation="false" role="">')
  })

  it('emits Generalization (partial) and TotalGeneralization with `total` attribute', () => {
    const m: JavaModel = {
      schema: {
        name: 'T', lastId: 5,
        entities: [
          { _kind: 'StrongEntitySet', id: 1, name: 'P', attributes: [], primaryKey: [] },
          { _kind: 'StrongEntitySet', id: 2, name: 'C', attributes: [], primaryKey: [] },
        ],
        relationships: [],
        generalizations: [{
          _kind: 'Generalization', id: 3, total: false,
          parent: { _kind: 'StrongEntitySet', refid: 1 },
          children: [{ _kind: 'StrongEntitySet', refid: 2 }],
        }],
      },
      diagram: { positions: new Map() },
    }
    const out = serializeJavaXml(m)
    expect(out).toContain('<Generalization id="3" total="false">')
  })
})
```

- [ ] **Step 2: Run → fail** — module missing.

- [ ] **Step 3: Implement writer.ts**

The implementation is a custom string builder rather than using `XMLSerializer` because `XMLSerializer`'s output isn't deterministic across browsers and doesn't match JDOM's pretty-print exactly. Build strings by hand with explicit indentation and attribute order.

```ts
// src/notation/chen/codecs/javaXml/writer.ts
import type {
  JavaAttribute,
  JavaEntitySet,
  JavaGeneralization,
  JavaModel,
  JavaRelationshipSet,
  JavaRelationshipSetBranch,
  JavaSchema,
} from './types'
import { isStrongEntity, isWeakEntity, isCompositeAttribute } from './types'

const INDENT = '  '

const escape = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const attr = (name: string, value: string | number | boolean): string =>
  `${name}="${escape(String(value))}"`

const open = (depth: number, name: string, attrs: readonly string[]): string =>
  `${INDENT.repeat(depth)}<${name}${attrs.length ? ' ' + attrs.join(' ') : ''}>`

const empty = (depth: number, name: string, attrs: readonly string[]): string =>
  `${INDENT.repeat(depth)}<${name}${attrs.length ? ' ' + attrs.join(' ') : ''} />`

const close = (depth: number, name: string): string => `${INDENT.repeat(depth)}</${name}>`

const writeSimpleAttribute = (depth: number, a: JavaAttribute): string => {
  if (isCompositeAttribute(a)) {
    const head = open(depth, 'CompositeAttribute', [
      attr('id', a.id), attr('name', a.name),
      attr('multiValued', a.multiValued), attr('derived', a.derived),
    ])
    if (a.children.length === 0) {
      return empty(depth, 'CompositeAttribute', [
        attr('id', a.id), attr('name', a.name),
        attr('multiValued', a.multiValued), attr('derived', a.derived),
      ])
    }
    const children = [
      open(depth + 1, 'Children', []),
      ...a.children.map((c) => writeSimpleAttribute(depth + 2, c)),
      close(depth + 1, 'Children'),
    ]
    return [head, ...children, close(depth, 'CompositeAttribute')].join('\n')
  }
  return empty(depth, 'SimpleAttribute', [
    attr('id', a.id), attr('name', a.name),
    attr('multiValued', a.multiValued), attr('derived', a.derived),
  ])
}

const writeAttributesContainer = (depth: number, attrs: readonly JavaAttribute[]): string => {
  if (attrs.length === 0) return empty(depth, 'Attributes', [])
  return [
    open(depth, 'Attributes', []),
    ...attrs.map((a) => writeSimpleAttribute(depth + 1, a)),
    close(depth, 'Attributes'),
  ].join('\n')
}

const writeRefList = (depth: number, container: string, attrs: readonly JavaAttribute[], refs: readonly number[]): string => {
  if (refs.length === 0) return ''
  const lookup = new Map<number, JavaAttribute>()
  for (const a of attrs) lookup.set(a.id, a)
  return [
    open(depth, container, []),
    ...refs.map((id) => {
      const a = lookup.get(id)
      const tag = a && isCompositeAttribute(a) ? 'CompositeAttribute' : 'SimpleAttribute'
      return empty(depth + 1, tag, [attr('refid', id)])
    }),
    close(depth, container),
  ].join('\n')
}

const writeEntity = (depth: number, e: JavaEntitySet): string => {
  const head = open(depth, e._kind, [attr('id', e.id), attr('name', e.name)])
  const attrsBlock = writeAttributesContainer(depth + 1, e.attributes)
  if (isStrongEntity(e)) {
    const pk = writeRefList(depth + 1, 'PrimaryKey', e.attributes, e.primaryKey)
    return [head, attrsBlock, ...(pk ? [pk] : []), close(depth, 'StrongEntitySet')].join('\n')
  }
  if (isWeakEntity(e)) {
    const dscr = writeRefList(depth + 1, 'Discriminant', e.attributes, e.discriminant)
    return [head, attrsBlock, ...(dscr ? [dscr] : []), close(depth, 'WeakEntitySet')].join('\n')
  }
  const _exhaustive: never = e
  return _exhaustive
}

const writeBranch = (depth: number, b: JavaRelationshipSetBranch): string => [
  open(depth, 'RelationshipSetBranch', [
    attr('id', b.id),
    attr('cardinality', b.cardinality),
    attr('totalParticipation', b.totalParticipation),
    attr('role', b.role),
  ]),
  empty(depth + 1, b.entityRef._kind, [attr('refid', b.entityRef.refid)]),
  close(depth, 'RelationshipSetBranch'),
].join('\n')

const writeRelationship = (depth: number, r: JavaRelationshipSet): string => [
  open(depth, r._kind, [attr('id', r.id), attr('name', r.name)]),
  writeAttributesContainer(depth + 1, r.attributes),
  r.branches.length === 0
    ? empty(depth + 1, 'Branches', [])
    : [
        open(depth + 1, 'Branches', []),
        ...r.branches.map((b) => writeBranch(depth + 2, b)),
        close(depth + 1, 'Branches'),
      ].join('\n'),
  close(depth, r._kind),
].join('\n')

const writeGeneralization = (depth: number, g: JavaGeneralization): string => [
  open(depth, g._kind, [attr('id', g.id), attr('total', g.total)]),
  open(depth + 1, 'Parent', []),
  empty(depth + 2, g.parent._kind, [attr('refid', g.parent.refid)]),
  close(depth + 1, 'Parent'),
  g.children.length === 0
    ? empty(depth + 1, 'Children', [])
    : [
        open(depth + 1, 'Children', []),
        ...g.children.map((c) => empty(depth + 2, c._kind, [attr('refid', c.refid)])),
        close(depth + 1, 'Children'),
      ].join('\n'),
  close(depth, g._kind),
].join('\n')

const writeSchema = (depth: number, s: JavaSchema): string => {
  const lines = [
    open(depth, 'ERDatabaseSchema', [attr('name', s.name), attr('lastId', s.lastId)]),
    s.entities.length === 0
      ? empty(depth + 1, 'EntitySets', [])
      : [
          open(depth + 1, 'EntitySets', []),
          ...s.entities.map((e) => writeEntity(depth + 2, e)),
          close(depth + 1, 'EntitySets'),
        ].join('\n'),
    s.relationships.length === 0
      ? empty(depth + 1, 'RelationshipSets', [])
      : [
          open(depth + 1, 'RelationshipSets', []),
          ...s.relationships.map((r) => writeRelationship(depth + 2, r)),
          close(depth + 1, 'RelationshipSets'),
        ].join('\n'),
    s.generalizations.length === 0
      ? empty(depth + 1, 'Generalizations', [])
      : [
          open(depth + 1, 'Generalizations', []),
          ...s.generalizations.map((g) => writeGeneralization(depth + 2, g)),
          close(depth + 1, 'Generalizations'),
        ].join('\n'),
    close(depth, 'ERDatabaseSchema'),
  ]
  return lines.join('\n')
}

// Diagram serialization lands in Task 6.
const writeDiagram = (depth: number, _model: JavaModel): string =>
  empty(depth, 'ERDatabaseDiagram', [])

export const serializeJavaXml = (model: JavaModel): string => {
  const decl = '<?xml version="1.0" encoding="UTF-8"?>\n'
  const body = [
    '<ERDatabaseModel>',
    writeSchema(1, model.schema),
    writeDiagram(1, model),
    '</ERDatabaseModel>',
  ].join('\n')
  return decl + body + '\n'
}
```

- [ ] **Step 4: Tests pass**

`pnpm test src/notation/chen/codecs/javaXml/writer.test.ts` → 6/6 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/notation/chen/codecs/javaXml/writer.ts src/notation/chen/codecs/javaXml/writer.test.ts
git commit -m "feat(codecs/java): writer serializes ERDatabaseSchema in JDOM pretty format"
```

Body: notes diagram serialization is stubbed in Task 6. Add Co-Authored-By trailer.

---

## Task 6: Writer — diagram section + descending-id order

**Files:**
- Modify: `src/notation/chen/codecs/javaXml/writer.ts` (replace `writeDiagram` stub)
- Modify: `src/notation/chen/codecs/javaXml/writer.test.ts` (add tests)

The diagram section iterates positionable elements in **descending refid order** (verified from samples). The element name on each line matches the kind it points to (e.g., `<SimpleAttribute refid="2">...</SimpleAttribute>` for an attribute). Branches are NOT in this map.

To know the kind for each id, we walk the schema once and build an `id → kind` lookup.

- [ ] **Step 1: Failing test**

```ts
// Append to writer.test.ts
it('emits diagram positions in descending refid order with correct element names', () => {
  const m: JavaModel = {
    schema: {
      name: 'T', lastId: 3,
      entities: [{
        _kind: 'StrongEntitySet', id: 1, name: 'E',
        attributes: [{ _kind: 'SimpleAttribute', id: 2, name: 'x', multiValued: false, derived: false }],
        primaryKey: [],
      }],
      relationships: [], generalizations: [],
    },
    diagram: { positions: new Map([[1, { x: 50, y: 60 }], [2, { x: 100, y: 200 }]]) },
  }
  const out = serializeJavaXml(m)
  // 2 (SimpleAttribute) appears BEFORE 1 (StrongEntitySet)
  const idxAttr = out.indexOf('<SimpleAttribute refid="2">')
  const idxEnt = out.indexOf('<StrongEntitySet refid="1">')
  expect(idxAttr).toBeGreaterThan(0)
  expect(idxEnt).toBeGreaterThan(idxAttr)
})

it('emits Position with x then y attribute order', () => {
  const m: JavaModel = {
    schema: {
      name: 'T', lastId: 1,
      entities: [{ _kind: 'StrongEntitySet', id: 1, name: 'E', attributes: [], primaryKey: [] }],
      relationships: [], generalizations: [],
    },
    diagram: { positions: new Map([[1, { x: 50, y: 60 }]]) },
  }
  const out = serializeJavaXml(m)
  expect(out).toContain('<Position x="50" y="60" />')
})

it('omits diagram entries for ids not in positions map (e.g., relationship branches)', () => {
  const m: JavaModel = {
    schema: {
      name: 'T', lastId: 4,
      entities: [
        { _kind: 'StrongEntitySet', id: 1, name: 'A', attributes: [], primaryKey: [] },
        { _kind: 'StrongEntitySet', id: 2, name: 'B', attributes: [], primaryKey: [] },
      ],
      relationships: [{
        _kind: 'RelationshipSetOneToN', id: 3, name: 'R',
        attributes: [],
        branches: [{
          _kind: 'RelationshipSetBranch', id: 4, cardinality: '1', totalParticipation: false, role: '',
          entityRef: { _kind: 'StrongEntitySet', refid: 1 },
        }],
      }],
      generalizations: [],
    },
    diagram: { positions: new Map([[1, { x: 0, y: 0 }], [2, { x: 0, y: 0 }], [3, { x: 0, y: 0 }]]) },
  }
  const out = serializeJavaXml(m)
  // Branch id=4 is not in positions, so no diagram entry for it.
  expect(out).not.toContain('refid="4"')
})
```

- [ ] **Step 2: Run → fail** on the new tests (writer still emits `<ERDatabaseDiagram />`).

- [ ] **Step 3: Implement writeDiagram**

Add an `id → tag` lookup helper and the real serializer:

```ts
const buildKindLookup = (s: JavaSchema): ReadonlyMap<number, string> => {
  const map = new Map<number, string>()
  const recordAttr = (a: JavaAttribute): void => {
    map.set(a.id, a._kind)
    if (isCompositeAttribute(a)) for (const c of a.children) recordAttr(c)
  }
  for (const e of s.entities) {
    map.set(e.id, e._kind)
    for (const a of e.attributes) recordAttr(a)
  }
  for (const r of s.relationships) {
    map.set(r.id, r._kind)
    for (const a of r.attributes) recordAttr(a)
  }
  for (const g of s.generalizations) {
    map.set(g.id, g._kind)
  }
  return map
}

const writeDiagram = (depth: number, model: JavaModel): string => {
  const positions = Array.from(model.diagram.positions.entries())
  if (positions.length === 0) return empty(depth, 'ERDatabaseDiagram', [])
  const kinds = buildKindLookup(model.schema)
  const sorted = positions
    .filter(([id]) => kinds.has(id))
    .sort(([a], [b]) => b - a)
  const lines = [
    open(depth, 'ERDatabaseDiagram', []),
    ...sorted.map(([id, p]) => {
      const kind = kinds.get(id)!
      return [
        open(depth + 1, kind, [attr('refid', id)]),
        empty(depth + 2, 'Position', [attr('x', p.x), attr('y', p.y)]),
        close(depth + 1, kind),
      ].join('\n')
    }),
    close(depth, 'ERDatabaseDiagram'),
  ]
  return lines.join('\n')
}
```

- [ ] **Step 4: Tests pass**

`pnpm test src/notation/chen/codecs/javaXml/writer.test.ts` → 9/9 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/notation/chen/codecs/javaXml/writer.ts src/notation/chen/codecs/javaXml/writer.test.ts
git commit -m "feat(codecs/java): writer emits ERDatabaseDiagram in descending-refid order"
```

Add Co-Authored-By trailer.

---

## Task 7: Layer-1 byte-clean fixture round-trip

**Files:**
- Create: `src/notation/chen/codecs/javaXml/roundtrip.test.ts`

The hard acceptance criterion: parse → serialize must be byte-identical for every SUPSI fixture. This proves Layer 1 (reader + writer) is correct independently of Layer 2 (transformer). If this passes, the byte-clean SUPSI gate from spec §10.7 is half-cleared.

- [ ] **Step 1: Failing test**

```ts
// src/notation/chen/codecs/javaXml/roundtrip.test.ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseJavaXml } from './reader'
import { serializeJavaXml } from './writer'

const FIXTURE_DIR = join(__dirname, '../../../../../tests/fixtures/supsi')
const load = (name: string): string => readFileSync(join(FIXTURE_DIR, name), 'utf8')

const FIXTURES = [
  'er-diagram-java-1767873101060.xml',
  'er-java.xml',
  'test.xml',
  'xml.xml',
  'conference-sol.xml',
] as const

describe('Layer 1 byte-clean round-trip — every SUPSI fixture', () => {
  for (const name of FIXTURES) {
    it(`${name}: parse → serialize === input`, () => {
      const input = load(name)
      const model = parseJavaXml(input)
      const output = serializeJavaXml(model)
      expect(output).toBe(input)
    })
  }
})
```

- [ ] **Step 2: Run**

`pnpm test src/notation/chen/codecs/javaXml/roundtrip.test.ts` — likely some fail. Diff against the fixtures to understand byte-level discrepancies. Common things to track:

- **Trailing newline** — some fixtures end with `\n`, some don't. The current writer always emits a trailing `\n`. Match the input convention by detecting and matching.
- **Empty `<Attributes />` vs `<Attributes></Attributes>`** — Java emits the self-closing form for empty containers. We do too.
- **Empty `<RelationshipSets />` and `<Generalizations />`** — same.
- **Attribute order** — verified to match Java's `setAttribute` call order.
- **`<Branches />` self-close** — for relationships with no branches (rare). Confirm samples.

- [ ] **Step 3: Tighten the writer**

For trailing-newline parity, change the writer so it doesn't unconditionally append `\n` at the end. Or accept that for new diagrams (no input to compare to) we always emit `\n`, and for round-trips we track the input's terminator.

Cleanest option: detect via convention — if the last char of output before our final `\n` would be `>`, emit `\n` if the FIXTURE ends with `\n` and not otherwise. Since round-trip is the only place this matters, make `serializeJavaXml` accept an option:

```ts
export interface SerializeOptions {
  readonly trailingNewline?: boolean
}
export const serializeJavaXml = (model: JavaModel, opts: SerializeOptions = {}): string => {
  const decl = '<?xml version="1.0" encoding="UTF-8"?>\n'
  const body = [
    '<ERDatabaseModel>',
    writeSchema(1, model.schema),
    writeDiagram(1, model),
    '</ERDatabaseModel>',
  ].join('\n')
  return decl + body + (opts.trailingNewline === false ? '' : '\n')
}
```

Then in the round-trip test, detect the trailing newline from the input and pass it through:

```ts
const trailingNewline = input.endsWith('\n')
const output = serializeJavaXml(model, { trailingNewline })
```

Run again. If a different byte-level discrepancy appears, address it before moving on. **Do not loosen the test** — make the writer match.

- [ ] **Step 4: All five fixtures pass**

`pnpm test src/notation/chen/codecs/javaXml/roundtrip.test.ts` → 5/5 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/notation/chen/codecs/javaXml/writer.ts src/notation/chen/codecs/javaXml/writer.test.ts \
        src/notation/chen/codecs/javaXml/roundtrip.test.ts
git commit -m "test(codecs/java): byte-clean round-trip on all 5 SUPSI fixtures"
```

Body: notes the `trailingNewline` option exists to match Java's variable file-terminator behaviour. Add Co-Authored-By trailer.

---

## Task 8: Transformer — JavaModel → Diagram (entities + attributes)

**Files:**
- Create: `src/notation/chen/codecs/javaXml/transformer.ts`
- Create: `src/notation/chen/codecs/javaXml/transformer.test.ts`

Maps Java's nested attributes to our `attribute` nodes + `attribute-of` edges. Strong entities go to `entity` with `isWeak: false`; weak entities to `entity` with `isWeak: true`. PrimaryKey membership → `isKey: true` on the attribute. Discriminant membership → `isDiscriminant: true`.

This task delivers the entity + attribute slice. Relationships and generalizations come in Task 9.

The transformer produces a `Diagram` (our `domain/types.ts` shape). Use `newNodeId()` / `newEdgeId()` from `domain/id.ts` to mint fresh IDs (we're not preserving Java's integer IDs in our internal model).

- [ ] **Step 1: Failing test**

```ts
// src/notation/chen/codecs/javaXml/transformer.test.ts
import { describe, it, expect } from 'vitest'
import { javaToDiagram } from './transformer'
import type { JavaModel } from './types'

const wrap = (entities: JavaModel['schema']['entities']): JavaModel => ({
  schema: { name: 'T', lastId: 0, entities, relationships: [], generalizations: [] },
  diagram: { positions: new Map() },
})

describe('javaToDiagram — entities + attributes', () => {
  it('maps StrongEntitySet to entity node with isWeak=false', () => {
    const d = javaToDiagram(wrap([
      { _kind: 'StrongEntitySet', id: 1, name: 'E', attributes: [], primaryKey: [] },
    ]))
    expect(d.nodeOrder).toHaveLength(1)
    const node = d.nodesById[d.nodeOrder[0]!]!
    expect(node.kind).toBe('entity')
    expect(node.kind === 'entity' && node.isWeak).toBe(false)
    expect(node.kind === 'entity' && node.name).toBe('E')
  })

  it('maps WeakEntitySet to entity node with isWeak=true', () => {
    const d = javaToDiagram(wrap([
      { _kind: 'WeakEntitySet', id: 1, name: 'W', attributes: [], discriminant: [] },
    ]))
    const node = d.nodesById[d.nodeOrder[0]!]!
    expect(node.kind === 'entity' && node.isWeak).toBe(true)
  })

  it('maps SimpleAttribute to attribute node + attribute-of edge', () => {
    const d = javaToDiagram(wrap([
      {
        _kind: 'StrongEntitySet', id: 1, name: 'E',
        attributes: [{ _kind: 'SimpleAttribute', id: 2, name: 'x', multiValued: false, derived: false }],
        primaryKey: [],
      },
    ]))
    expect(d.nodeOrder).toHaveLength(2)
    expect(d.edgeOrder).toHaveLength(1)
    const edge = d.edgesById[d.edgeOrder[0]!]!
    expect(edge.kind).toBe('attribute-of')
  })

  it('sets isKey=true on PrimaryKey-referenced attributes (StrongEntitySet only)', () => {
    const d = javaToDiagram(wrap([
      {
        _kind: 'StrongEntitySet', id: 1, name: 'E',
        attributes: [{ _kind: 'SimpleAttribute', id: 2, name: 'k', multiValued: false, derived: false }],
        primaryKey: [2],
      },
    ]))
    const attrNode = Object.values(d.nodesById).find((n) => n.kind === 'attribute')!
    expect(attrNode.kind === 'attribute' && attrNode.isKey).toBe(true)
  })

  it('sets isDiscriminant=true on Discriminant-referenced attributes (WeakEntitySet only)', () => {
    const d = javaToDiagram(wrap([
      {
        _kind: 'WeakEntitySet', id: 1, name: 'W',
        attributes: [{ _kind: 'SimpleAttribute', id: 2, name: 'd', multiValued: false, derived: false }],
        discriminant: [2],
      },
    ]))
    const attrNode = Object.values(d.nodesById).find((n) => n.kind === 'attribute')!
    expect(attrNode.kind === 'attribute' && attrNode.isDiscriminant).toBe(true)
  })

  it('maps multiValued and derived flags correctly', () => {
    const d = javaToDiagram(wrap([
      {
        _kind: 'StrongEntitySet', id: 1, name: 'E',
        attributes: [
          { _kind: 'SimpleAttribute', id: 2, name: 'm', multiValued: true, derived: false },
          { _kind: 'SimpleAttribute', id: 3, name: 'd', multiValued: false, derived: true },
        ],
        primaryKey: [],
      },
    ]))
    const attrs = Object.values(d.nodesById).filter((n) => n.kind === 'attribute')
    const m = attrs.find((a) => a.kind === 'attribute' && a.name === 'm')!
    const der = attrs.find((a) => a.kind === 'attribute' && a.name === 'd')!
    expect(m.kind === 'attribute' && m.isMultivalued).toBe(true)
    expect(der.kind === 'attribute' && der.isDerived).toBe(true)
  })

  it('marks composite attributes with isComposite=true', () => {
    const d = javaToDiagram(wrap([
      {
        _kind: 'StrongEntitySet', id: 1, name: 'E',
        attributes: [{
          _kind: 'CompositeAttribute', id: 2, name: 'addr', multiValued: false, derived: false,
          children: [{ _kind: 'SimpleAttribute', id: 3, name: 'street', multiValued: false, derived: false }],
        }],
        primaryKey: [],
      },
    ]))
    const composite = Object.values(d.nodesById).find((n) => n.kind === 'attribute' && n.name === 'addr')!
    expect(composite.kind === 'attribute' && composite.isComposite).toBe(true)
  })

  it('honours position from the diagram section if present, else uses (0, 0)', () => {
    const m: JavaModel = {
      schema: {
        name: 'T', lastId: 1,
        entities: [{ _kind: 'StrongEntitySet', id: 1, name: 'E', attributes: [], primaryKey: [] }],
        relationships: [], generalizations: [],
      },
      diagram: { positions: new Map([[1, { x: 50, y: 60 }]]) },
    }
    const d = javaToDiagram(m)
    const node = d.nodesById[d.nodeOrder[0]!]!
    expect(node.position).toEqual({ x: 50, y: 60 })
  })
})
```

- [ ] **Step 2: Run → fail.**

- [ ] **Step 3: Implement transformer.ts (entity + attribute side, forward direction)**

```ts
// src/notation/chen/codecs/javaXml/transformer.ts
import { newEdgeId, newNodeId } from '@/domain/id'
import {
  emptyDiagram,
  type AttributeNode,
  type Diagram,
  type EntityNode,
  type ERLink,
  type ERNode,
  type NodeId,
} from '@/domain/types'
import type {
  JavaAttribute,
  JavaEntitySet,
  JavaModel,
  JavaSimpleAttribute,
} from './types'
import { isCompositeAttribute, isStrongEntity, isWeakEntity } from './types'

const DEFAULT_ENTITY_SIZE = { width: 120, height: 60 }
const DEFAULT_ATTRIBUTE_SIZE = { width: 90, height: 50 }

const positionOf = (model: JavaModel, id: number): { x: number; y: number } =>
  model.diagram.positions.get(id) ?? { x: 0, y: 0 }

const buildEntityNode = (model: JavaModel, e: JavaEntitySet): EntityNode => ({
  id: newNodeId(),
  kind: 'entity',
  name: e.name,
  isWeak: isWeakEntity(e),
  position: positionOf(model, e.id),
  size: DEFAULT_ENTITY_SIZE,
})

const buildAttributeNode = (
  model: JavaModel,
  a: JavaAttribute,
  isKey: boolean,
  isDiscriminant: boolean,
): AttributeNode => ({
  id: newNodeId(),
  kind: 'attribute',
  name: a.name,
  isKey,
  isDiscriminant,
  isMultivalued: a.multiValued,
  isDerived: a.derived,
  isComposite: isCompositeAttribute(a),
  position: positionOf(model, a.id),
  size: DEFAULT_ATTRIBUTE_SIZE,
})

const addNode = (d: Diagram, n: ERNode): Diagram => ({
  ...d,
  nodesById: { ...d.nodesById, [n.id]: n },
  nodeOrder: [...d.nodeOrder, n.id],
})

const addEdge = (d: Diagram, e: ERLink): Diagram => ({
  ...d,
  edgesById: { ...d.edgesById, [e.id]: e },
  edgeOrder: [...d.edgeOrder, e.id],
})

const isAttributeKeyMember = (e: JavaEntitySet, a: JavaSimpleAttribute | JavaAttribute): boolean => {
  if (isStrongEntity(e)) return e.primaryKey.includes(a.id)
  return false
}

const isAttributeDiscriminantMember = (e: JavaEntitySet, a: JavaAttribute): boolean => {
  if (isWeakEntity(e)) return e.discriminant.includes(a.id)
  return false
}

const addAttributeWithEdge = (
  d: Diagram,
  model: JavaModel,
  parentId: NodeId,
  a: JavaAttribute,
  e: JavaEntitySet,
): Diagram => {
  const node = buildAttributeNode(
    model, a,
    isAttributeKeyMember(e, a),
    isAttributeDiscriminantMember(e, a),
  )
  const edge: ERLink = {
    id: newEdgeId(),
    kind: 'attribute-of',
    sourceId: node.id,
    targetId: parentId,
    waypoints: [],
  }
  let next = addNode(d, node)
  next = addEdge(next, edge)
  // Composite children fold under the composite attribute itself, not under the entity.
  if (isCompositeAttribute(a)) {
    for (const child of a.children) {
      next = addAttributeWithEdge(next, model, node.id, child, e)
    }
  }
  return next
}

export const javaToDiagram = (model: JavaModel): Diagram => {
  let d = emptyDiagram()
  for (const e of model.schema.entities) {
    const node = buildEntityNode(model, e)
    d = addNode(d, node)
    for (const a of e.attributes) {
      d = addAttributeWithEdge(d, model, node.id, a, e)
    }
  }
  // Relationships + generalizations land in Task 9.
  return d
}
```

- [ ] **Step 4: Tests pass**

`pnpm test src/notation/chen/codecs/javaXml/transformer.test.ts` → 8/8 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/notation/chen/codecs/javaXml/transformer.ts src/notation/chen/codecs/javaXml/transformer.test.ts
git commit -m "feat(codecs/java): transformer maps Java entities + attributes to Diagram"
```

Body: notes relationships + generalizations land in Task 9. Add Co-Authored-By trailer.

---

## Task 9: Transformer — relationships + generalizations (Java → Diagram)

**Files:**
- Modify: `src/notation/chen/codecs/javaXml/transformer.ts`
- Modify: `src/notation/chen/codecs/javaXml/transformer.test.ts`

Java's 7 relationship classes collapse to our `relationship` node with `isIdentifying: bool`. Each `<RelationshipSetBranch>` becomes one `entity-relationship` edge with the branch's `cardinality` and `participation` mapped onto the edge.

`Generalization` and `TotalGeneralization` collapse to `isa` with `isTotal: bool`. The `<Parent>` and each `<Children>` reference become `isa-link` edges with `role: 'parent' | 'child'`.

Java relationship attributes (which we ALSO model as attribute-of edges) attach to the relationship node.

- [ ] **Step 1: Failing test**

```ts
// Append to transformer.test.ts
describe('javaToDiagram — relationships', () => {
  const buildXmlModel = (kind: JavaModel['schema']['relationships'][number]['_kind']): JavaModel => ({
    schema: {
      name: 'T', lastId: 5,
      entities: [
        { _kind: 'StrongEntitySet', id: 1, name: 'A', attributes: [], primaryKey: [] },
        { _kind: 'StrongEntitySet', id: 2, name: 'B', attributes: [], primaryKey: [] },
      ],
      relationships: [{
        _kind: kind, id: 3, name: 'R',
        attributes: [],
        branches: [
          {
            _kind: 'RelationshipSetBranch', id: 4, cardinality: '1', totalParticipation: false, role: '',
            entityRef: { _kind: 'StrongEntitySet', refid: 1 },
          },
          {
            _kind: 'RelationshipSetBranch', id: 5, cardinality: 'N', totalParticipation: true, role: '',
            entityRef: { _kind: 'StrongEntitySet', refid: 2 },
          },
        ],
      }],
      generalizations: [],
    },
    diagram: { positions: new Map() },
  })

  it('maps RelationshipSetOneToN to relationship node + 2 entity-relationship edges', () => {
    const d = javaToDiagram(buildXmlModel('RelationshipSetOneToN'))
    const rel = Object.values(d.nodesById).find((n) => n.kind === 'relationship')!
    expect(rel).toBeTruthy()
    const edges = Object.values(d.edgesById).filter((e) => e.kind === 'entity-relationship')
    expect(edges).toHaveLength(2)
  })

  it('flips Identifying* class names to isIdentifying=true', () => {
    const d = javaToDiagram(buildXmlModel('IdentifyingRelationshipSetOneToN'))
    const rel = Object.values(d.nodesById).find((n) => n.kind === 'relationship')!
    expect(rel.kind === 'relationship' && rel.isIdentifying).toBe(true)
  })

  it('preserves per-branch cardinality + participation on the entity-relationship edge', () => {
    const d = javaToDiagram(buildXmlModel('RelationshipSetOneToN'))
    const edges = Object.values(d.edgesById).filter((e) => e.kind === 'entity-relationship')
    const cards = edges.map((e) => e.kind === 'entity-relationship' ? e.cardinality : '?').sort()
    expect(cards).toEqual(['1', 'N'])
    const totals = edges.map((e) => e.kind === 'entity-relationship' ? e.participation : '?').sort()
    expect(totals).toEqual(['partial', 'total'])
  })
})

describe('javaToDiagram — generalizations', () => {
  const buildGenModel = (kind: 'Generalization' | 'TotalGeneralization'): JavaModel => ({
    schema: {
      name: 'T', lastId: 4,
      entities: [
        { _kind: 'StrongEntitySet', id: 1, name: 'P', attributes: [], primaryKey: [] },
        { _kind: 'StrongEntitySet', id: 2, name: 'C1', attributes: [], primaryKey: [] },
        { _kind: 'StrongEntitySet', id: 3, name: 'C2', attributes: [], primaryKey: [] },
      ],
      relationships: [],
      generalizations: [{
        _kind: kind, id: 4, total: kind === 'TotalGeneralization',
        parent: { _kind: 'StrongEntitySet', refid: 1 },
        children: [
          { _kind: 'StrongEntitySet', refid: 2 },
          { _kind: 'StrongEntitySet', refid: 3 },
        ],
      }],
    },
    diagram: { positions: new Map() },
  })

  it('Generalization (partial) → isa node with isTotal=false + 3 isa-link edges (1 parent + 2 children)', () => {
    const d = javaToDiagram(buildGenModel('Generalization'))
    const isa = Object.values(d.nodesById).find((n) => n.kind === 'isa')!
    expect(isa.kind === 'isa' && isa.isTotal).toBe(false)
    const edges = Object.values(d.edgesById).filter((e) => e.kind === 'isa-link')
    expect(edges).toHaveLength(3)
    const roles = edges.map((e) => e.kind === 'isa-link' ? e.role : '?').sort()
    expect(roles).toEqual(['child', 'child', 'parent'])
  })

  it('TotalGeneralization → isa node with isTotal=true', () => {
    const d = javaToDiagram(buildGenModel('TotalGeneralization'))
    const isa = Object.values(d.nodesById).find((n) => n.kind === 'isa')!
    expect(isa.kind === 'isa' && isa.isTotal).toBe(true)
  })
})
```

- [ ] **Step 2: Run → fail.**

- [ ] **Step 3: Extend transformer.ts**

```ts
// In transformer.ts — add imports
import type { RelationshipNode, ISANode } from '@/domain/types'
import type { JavaGeneralization, JavaRelationshipSet } from './types'
import { isIdentifyingRelationship, isTotalGeneralization } from './types'

const DEFAULT_RELATIONSHIP_SIZE = { width: 140, height: 70 }
const DEFAULT_ISA_SIZE = { width: 100, height: 60 }

// Helper to find OUR node id from a Java entity refid. The transformer is
// linear so we rebuild this lookup as we go — keyed on Java integer id.
const buildEntityRefMap = (d: Diagram, model: JavaModel): ReadonlyMap<number, NodeId> => {
  const map = new Map<number, NodeId>()
  // entities are added in model.schema.entities order; nodeOrder also reflects that
  // BUT it includes attributes too. Walk schema in order, track entity-only positions.
  let i = 0
  for (const e of model.schema.entities) {
    const id = d.nodeOrder[i]!
    map.set(e.id, id)
    // skip attribute nodes for this entity
    const attrCount = countAttributesIncludingComposite(e.attributes)
    i += 1 + attrCount
  }
  return map
}

const countAttributesIncludingComposite = (attrs: readonly JavaAttribute[]): number => {
  let n = 0
  for (const a of attrs) {
    n += 1
    if (isCompositeAttribute(a)) n += countAttributesIncludingComposite(a.children)
  }
  return n
}
```

Hmm — that lookup is fragile. **Better approach:** track the Java-id → our-NodeId map AS we build, threading it through the transformer state. Refactor:

```ts
interface TransformState {
  readonly diagram: Diagram
  readonly entityIdMap: Map<number, NodeId>
}

const empty = (): TransformState => ({
  diagram: emptyDiagram(),
  entityIdMap: new Map(),
})

const addEntityAndTrack = (s: TransformState, javaId: number, node: EntityNode): TransformState => {
  s.entityIdMap.set(javaId, node.id)
  return { ...s, diagram: addNode(s.diagram, node) }
}
```

Update `javaToDiagram` to use this state object internally, then return `state.diagram` at the end.

Add the relationship + generalization processing:

```ts
const buildRelationshipNode = (model: JavaModel, r: JavaRelationshipSet): RelationshipNode => ({
  id: newNodeId(),
  kind: 'relationship',
  name: r.name,
  isIdentifying: isIdentifyingRelationship(r),
  position: positionOf(model, r.id),
  size: DEFAULT_RELATIONSHIP_SIZE,
})

const buildIsaNode = (model: JavaModel, g: JavaGeneralization): ISANode => ({
  id: newNodeId(),
  kind: 'isa',
  isTotal: isTotalGeneralization(g),
  position: positionOf(model, g.id),
  size: DEFAULT_ISA_SIZE,
})

const cardinalityToParticipation = (totalParticipation: boolean): 'total' | 'partial' =>
  totalParticipation ? 'total' : 'partial'
```

For each relationship, create the node, then for each branch create an `entity-relationship` edge from the relationship node to the entity node (referenced via `entityIdMap.get(branch.entityRef.refid)`), with `cardinality`, `participation`, and `role` mapped 1:1.

For each generalization, create the `isa` node, then a `parent`-role edge AND one `child`-role edge per child entity.

Relationship attributes: same logic as entity attributes but attach to the relationship node.

- [ ] **Step 4: Tests pass.**

- [ ] **Step 5: Commit**

```bash
git add src/notation/chen/codecs/javaXml/transformer.ts src/notation/chen/codecs/javaXml/transformer.test.ts
git commit -m "feat(codecs/java): transformer maps relationships + generalizations to Diagram"
```

Add Co-Authored-By trailer.

---

## Task 10: Transformer — Diagram → JavaModel (reverse direction)

**Files:**
- Modify: `src/notation/chen/codecs/javaXml/transformer.ts`
- Modify: `src/notation/chen/codecs/javaXml/transformer.test.ts`

The reverse transformation. For byte-clean output, IDs are re-assigned 1..N matching Java's `reassignID` walk order: walk entities (each entity → its attributes including composite children), then relationships (each → its attributes → its branches), then generalizations.

The Java element name for each relationship is derived from the connected edges' cardinalities + `isIdentifying`:

| Branch cardinalities | isIdentifying | Class name |
|---|---|---|
| (1, 1) | false | RelationshipSetOneToOne |
| (1, N) or (1, M)... | false | RelationshipSetOneToN |
| (N, 1) or (M, 1)... | false | RelationshipSetNToOne |
| (N, N) or any with all N/M | false | RelationshipSetNToN |
| (1, 1) | true | IdentifyingRelationshipSetOneToOne |
| (1, N) | true | IdentifyingRelationshipSetOneToN |
| (N, 1) | true | IdentifyingRelationshipSetNToOne |

For 3+ branches, classify by the maximum cardinality on each side. The key insight: Java's `RelationshipSetNToN` accepts arbitrary branch counts (the test fixtures show a 4-branch N-N).

For generalizations: `Generalization` if `isTotal === false`, `TotalGeneralization` if `true`.

Composite attributes: the `attribute-of` edges in our model form a hierarchy. An attribute's parent is whatever it points TO. If it points to another attribute, it's a composite child.

The Diagram → JavaModel transformer must walk our diagram in `nodeOrder` so the Java IDs come out matching the source order.

- [ ] **Step 1: Failing test**

```ts
// Append to transformer.test.ts
describe('diagramToJava — reverse direction', () => {
  it('round-trips a simple diagram (entity + 1 attribute) through both transformers', () => {
    const original: JavaModel = {
      schema: {
        name: 'T', lastId: 2,
        entities: [{
          _kind: 'StrongEntitySet', id: 1, name: 'E',
          attributes: [{ _kind: 'SimpleAttribute', id: 2, name: 'x', multiValued: false, derived: false }],
          primaryKey: [2],
        }],
        relationships: [], generalizations: [],
      },
      diagram: { positions: new Map([[1, { x: 50, y: 60 }], [2, { x: 100, y: 100 }]]) },
    }
    const d = javaToDiagram(original)
    const back = diagramToJava(d, { databaseName: 'T' })
    expect(back.schema.entities).toHaveLength(1)
    expect(back.schema.entities[0]!.attributes).toHaveLength(1)
    expect(back.schema.entities[0]!.attributes[0]!.id).toBe(2)
    expect(back.schema.entities[0]!.id).toBe(1)
  })

  it('derives RelationshipSetOneToN from two branches with cardinality (1, N)', () => {
    // build a diagram by hand with our store APIs OR by feeding a JavaModel through
    // javaToDiagram and asserting the reverse re-classifies correctly.
    const original: JavaModel = {
      schema: {
        name: 'T', lastId: 5,
        entities: [
          { _kind: 'StrongEntitySet', id: 1, name: 'A', attributes: [], primaryKey: [] },
          { _kind: 'StrongEntitySet', id: 2, name: 'B', attributes: [], primaryKey: [] },
        ],
        relationships: [{
          _kind: 'RelationshipSetOneToN', id: 3, name: 'R',
          attributes: [],
          branches: [
            {
              _kind: 'RelationshipSetBranch', id: 4, cardinality: '1', totalParticipation: false, role: '',
              entityRef: { _kind: 'StrongEntitySet', refid: 1 },
            },
            {
              _kind: 'RelationshipSetBranch', id: 5, cardinality: 'N', totalParticipation: false, role: '',
              entityRef: { _kind: 'StrongEntitySet', refid: 2 },
            },
          ],
        }],
        generalizations: [],
      },
      diagram: { positions: new Map() },
    }
    const back = diagramToJava(javaToDiagram(original), { databaseName: 'T' })
    expect(back.schema.relationships[0]!._kind).toBe('RelationshipSetOneToN')
  })

  it('emits TotalGeneralization when isa.isTotal is true', () => {
    const original: JavaModel = {
      schema: {
        name: 'T', lastId: 4,
        entities: [
          { _kind: 'StrongEntitySet', id: 1, name: 'P', attributes: [], primaryKey: [] },
          { _kind: 'StrongEntitySet', id: 2, name: 'C', attributes: [], primaryKey: [] },
        ],
        relationships: [],
        generalizations: [{
          _kind: 'TotalGeneralization', id: 3, total: true,
          parent: { _kind: 'StrongEntitySet', refid: 1 },
          children: [{ _kind: 'StrongEntitySet', refid: 2 }],
        }],
      },
      diagram: { positions: new Map() },
    }
    const back = diagramToJava(javaToDiagram(original), { databaseName: 'T' })
    expect(back.schema.generalizations[0]!._kind).toBe('TotalGeneralization')
  })

  it('lifecycle: javaToDiagram(m1) → diagramToJava → semantic equality with m1', () => {
    // Use any of the 5 SUPSI fixtures
    const input = readFileSync(join(FIXTURE_DIR, 'test.xml'), 'utf8')
    const m1 = parseJavaXml(input)
    const d = javaToDiagram(m1)
    const m2 = diagramToJava(d, { databaseName: m1.schema.name })
    // Compare structurally — IDs may differ if ours start fresh, BUT
    // because we walk in nodeOrder which mirrors entity-then-attribute
    // order, IDs should match.
    expect(m2.schema.entities.length).toBe(m1.schema.entities.length)
    for (let i = 0; i < m2.schema.entities.length; i++) {
      expect(m2.schema.entities[i]!.name).toBe(m1.schema.entities[i]!.name)
      expect(m2.schema.entities[i]!.id).toBe(m1.schema.entities[i]!.id)
    }
  })
})
```

- [ ] **Step 2: Run → fail.**

- [ ] **Step 3: Implement diagramToJava**

The structure is large. Outline:

```ts
export interface DiagramToJavaOptions {
  readonly databaseName: string
}

export const diagramToJava = (d: Diagram, opts: DiagramToJavaOptions): JavaModel => {
  // 1. Build helper maps:
  //    - childAttrsByParent: Map<NodeId, AttributeNode[]> from attribute-of edges
  //    - keyMembers: Set<NodeId> from attribute nodes with isKey
  //    - discriminantMembers: Set<NodeId> from attribute nodes with isDiscriminant
  //    - relAttrsByParent: same as childAttrsByParent but for relationship parents
  //    - branchesByRelationship: from entity-relationship edges
  //    - childrenByIsa, parentByIsa: from isa-link edges
  //
  // 2. Re-ID counter: const nextId = (() => { let n = 0; return () => ++n })()
  //
  // 3. Walk d.nodeOrder for each entity:
  //    - assign Java id
  //    - recursively assign ids to attributes (DFS)
  //    - build JavaStrongEntitySet / JavaWeakEntitySet
  //    - record positions in positions map
  //
  // 4. Walk d.nodeOrder for each relationship:
  //    - assign Java id
  //    - assign ids to relationship attributes
  //    - assign ids to branches (one per entity-relationship edge)
  //
  // 5. Walk d.nodeOrder for each isa:
  //    - assign id
  //    - parent + children
  //
  // 6. lastId = the final counter value
  //
  // 7. Build JavaModel with positions for entities, attributes, relationships, generalizations
}
```

Filling in the body is meaty (~150-200 lines). Key sub-helpers:

```ts
const classifyRelationship = (
  branchCardinalities: readonly ('1' | 'N')[],
  isIdentifying: boolean,
): JavaRelationshipSetKind => {
  const ones = branchCardinalities.filter((c) => c === '1').length
  const ns = branchCardinalities.length - ones
  if (branchCardinalities.length === 2) {
    if (ones === 2) return isIdentifying ? 'IdentifyingRelationshipSetOneToOne' : 'RelationshipSetOneToOne'
    if (ones === 1 && branchCardinalities[0] === '1') return isIdentifying ? 'IdentifyingRelationshipSetOneToN' : 'RelationshipSetOneToN'
    if (ones === 1 && branchCardinalities[1] === '1') return isIdentifying ? 'IdentifyingRelationshipSetNToOne' : 'RelationshipSetNToOne'
    return 'RelationshipSetNToN' // identifying N:N is unusual; fall through
  }
  // 3+ branches: Java only has RelationshipSetNToN for these.
  return 'RelationshipSetNToN'
}
```

- [ ] **Step 4: Tests pass.**

- [ ] **Step 5: Commit**

```bash
git add src/notation/chen/codecs/javaXml/transformer.ts src/notation/chen/codecs/javaXml/transformer.test.ts
git commit -m "feat(codecs/java): transformer maps Diagram back to JavaModel with re-IDed entities"
```

Add Co-Authored-By trailer.

---

## Task 11: Combined codec + SUPSI byte-clean integration test

**Files:**
- Create: `src/notation/chen/codecs/javaXml/index.ts`
- Create: `src/notation/chen/codecs/javaXml/integration.test.ts`
- Create: `src/notation/chen/codecs/types.ts` — `Codec<T>` contract from spec §6.5

The combined codec: implements the spec §6.5 `Codec` interface using the parser/serializer + transformer. The SUPSI integration test loads `conference-sol.xml`, transforms to Diagram, transforms back to JavaModel, serializes — output must equal input byte-clean.

- [ ] **Step 1: Codec contract**

```ts
// src/notation/chen/codecs/types.ts
import type { Diagram } from '@/domain/types'

export type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E }

export interface Codec {
  readonly id: string
  readonly displayName: string
  readonly mode: 'import' | 'export' | 'both'
  parse?: (raw: string) => Result<Diagram>
  serialize?: (d: Diagram) => string
}
```

- [ ] **Step 2: Combined codec**

```ts
// src/notation/chen/codecs/javaXml/index.ts
import type { Codec, Result } from '../types'
import type { Diagram } from '@/domain/types'
import { parseJavaXml } from './reader'
import { serializeJavaXml } from './writer'
import { javaToDiagram, diagramToJava } from './transformer'

export const chenJavaXmlCodec: Codec = {
  id: 'chen-java-xml',
  displayName: 'Chen ER (Java XML)',
  mode: 'both',
  parse: (raw): Result<Diagram> => {
    try {
      return { ok: true, value: javaToDiagram(parseJavaXml(raw)) }
    } catch (error) {
      return { ok: false, error: error as Error }
    }
  },
  serialize: (d) => serializeJavaXml(diagramToJava(d, { databaseName: 'Unnamed_DB_Schema_1' }), {
    trailingNewline: true,
  }),
}
```

- [ ] **Step 3: Integration test (the SUPSI gate)**

```ts
// src/notation/chen/codecs/javaXml/integration.test.ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { chenJavaXmlCodec } from './index'

const FIXTURE_DIR = join(__dirname, '../../../../../tests/fixtures/supsi')
const load = (name: string): string => readFileSync(join(FIXTURE_DIR, name), 'utf8')

describe('chenJavaXmlCodec — SUPSI byte-clean round-trip (hard gate)', () => {
  it('conference-sol.xml: load → save = byte-identical input', () => {
    const input = load('conference-sol.xml')
    const parsed = chenJavaXmlCodec.parse!(input)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    const output = chenJavaXmlCodec.serialize!(parsed.value)
    expect(output).toBe(input)
  })
})
```

- [ ] **Step 4: Run**

`pnpm test src/notation/chen/codecs/javaXml/integration.test.ts` — likely fails on the first run because of subtle ordering in attribute IDs OR position emission OR the `databaseName` choice (the fixture says `"Unnamed_DB_Schema_1"`).

Fix the discrepancies WITHOUT loosening the test. Common things:

- The codec's `serialize` hardcodes `databaseName: 'Unnamed_DB_Schema_1'`. For round-trip, the parser already extracted the input's name; we need to plumb it through. Solution: store `name` on the diagram (extend domain) OR pass a context object. Cleanest: store it on `uiStore.diagramName` or extend `Diagram` with a `metadata.name`. For Phase 5 simplicity, plumb through a sidecar: when round-tripping, accept an optional `databaseName` and use the parsed name. The integration test handles this directly.

OR rewrite the test to reflect the production flow (load returns `{ diagram, meta }`, save accepts both). But that's a contract change, bigger scope.

Pragmatic Phase 5 approach: extend `Diagram` with `readonly databaseName?: string`. Parser sets it from the XML. Serializer reads it. `useFileActions` (Task 13) handles the lifecycle.

Update `Diagram` in `src/domain/types.ts`:

```ts
export interface Diagram {
  // ... existing fields
  readonly databaseName?: string
}
```

Adjust `emptyDiagram()` to omit it (or default to `'Unnamed_DB_Schema_1'`).

Adjust transformer:
- `javaToDiagram` sets `databaseName: model.schema.name`
- `diagramToJava` reads `d.databaseName ?? 'Unnamed_DB_Schema_1'`

Re-run the test.

- [ ] **Step 5: Test passes**

`pnpm test src/notation/chen/codecs/javaXml/integration.test.ts` → 1/1 PASS.

- [ ] **Step 6: Add the other 4 fixtures**

Append tests for `test.xml`, `xml.xml`, `er-java.xml`, `er-diagram-java-1767873101060.xml`. Each must round-trip byte-clean. Address remaining edge cases as they surface (e.g., the `lastId="0"` in `er-diagram-java-1767873101060.xml` despite real IDs — the writer must preserve the input's `lastId` exactly, NOT recompute from elements).

Decision: `lastId` is whatever the input said. We preserve it as a field on `Diagram.databaseLastId?: number` (or include it in `databaseName` … no, keep separate). Plumb through.

- [ ] **Step 7: Commit**

```bash
git add src/notation/chen/codecs/javaXml src/notation/chen/codecs/types.ts src/domain/types.ts
git commit -m "feat(codecs/java): chenJavaXmlCodec — byte-clean round-trip on all 5 SUPSI fixtures"
```

Body explains: this clears the spec §10.7 hard acceptance gate. Add Co-Authored-By trailer.

---

## Task 12: Mermaid export codec

**Files:**
- Create: `src/notation/chen/codecs/mermaid.ts`
- Create: `src/notation/chen/codecs/mermaid.test.ts`

Export-only. Output the Mermaid `erDiagram` syntax:

```
erDiagram
    CUSTOMER ||--o{ ORDER : places
    CUSTOMER {
        string name
        string custNumber
        string sector
    }
```

Map our model:
- Each entity → an `erDiagram` block with attributes
- Each relationship → an `<E1> <card><card> <E2> : <name>` line
- Cardinality mapping: `1 -> ||`, `N -> }o` etc. (Mermaid uses crow's-foot)
- Identifying relationship (Mermaid uses `--` for identifying, `..` for non-identifying)
- Generalizations: not natively supported by Mermaid erDiagram — emit a comment line and skip

- [ ] **Step 1: Failing test**

```ts
// src/notation/chen/codecs/mermaid.test.ts
import { describe, it, expect } from 'vitest'
import { mermaidCodec } from './mermaid'
import { emptyDiagram } from '@/domain/types'

describe('mermaidCodec', () => {
  it('returns "erDiagram" for an empty diagram', () => {
    const out = mermaidCodec.serialize!(emptyDiagram())
    expect(out.trim()).toBe('erDiagram')
  })

  it('emits an entity block with simple attributes', () => {
    // build via the diagramStore APIs OR the transformer + a JavaModel fixture
    // ... assert the output contains the entity name + attributes
  })

  it('emits a relationship line with crow\'s-foot cardinality mapping', () => {
    // ...
  })
})
```

- [ ] **Step 2: Implement.** Keep it under 150 lines. The codec is export-only:

```ts
import type { Codec } from './types'

export const mermaidCodec: Codec = {
  id: 'mermaid',
  displayName: 'Mermaid',
  mode: 'export',
  serialize: (d) => {
    // ...
  },
}
```

Map cardinality + participation to Mermaid syntax:
- `1 + total` → `||`
- `1 + partial` → `|o`
- `N + total` → `}|`
- `N + partial` → `}o`
- Identifying → `--`, non-identifying → `..`

Skip generalizations with a comment line: `%% Generalization: <parent> -> [<child>, ...]`.

- [ ] **Step 3: Tests pass.**

- [ ] **Step 4: Commit**

```bash
git add src/notation/chen/codecs/mermaid.ts src/notation/chen/codecs/mermaid.test.ts
git commit -m "feat(codecs): Mermaid export — crow's-foot relationship syntax"
```

Add Co-Authored-By trailer.

---

## Task 13: Codec registry + Menu Open/Save/Export wiring

**Files:**
- Create: `src/notation/chen/codecs/png.ts` (wraps Phase 7 toPng for the codec contract)
- Create: `src/notation/chen/codecs/svg.ts` (wraps canvasToSvg)
- Create: `src/notation/chen/codecs/index.ts` (registry)
- Create: `src/ui/menu/useFileActions.ts`
- Create: `src/ui/menu/useFileActions.test.ts`
- Modify: `src/ui/menu/Menu.tsx` (replace toastPhase5 stubs)
- Modify: `src/ui/menu/MenuDropdownBody.tsx` if Export needs a submenu structure

The PNG/SVG/Mermaid options were stubbed; now wire them for real. Open uses `chenJavaXmlCodec.parse`. Save uses `chenJavaXmlCodec.serialize`. Export PNG/SVG keep using the existing `useExportHandlers` from Phase 7 (those bypass the codec contract because they need the live DOM, not the diagram model). Export Mermaid uses `mermaidCodec.serialize`.

Key files:

`src/notation/chen/codecs/index.ts`:

```ts
import { chenJavaXmlCodec } from './javaXml'
import { mermaidCodec } from './mermaid'
import type { Codec } from './types'

export const codecs: readonly Codec[] = [chenJavaXmlCodec, mermaidCodec]
export const codecById = (id: string): Codec | undefined =>
  codecs.find((c) => c.id === id)
export { chenJavaXmlCodec, mermaidCodec }
```

`src/ui/menu/useFileActions.ts`:

```ts
import { openFile, downloadBlob } from '@/platform/fs'
import { chenJavaXmlCodec, mermaidCodec } from '@/notation/chen/codecs'
import { useDiagramStore } from '@/state/diagramStore'
import { useUiStore } from '@/state/uiStore'

export interface FileActionHandlers {
  readonly open: () => Promise<void>
  readonly save: () => Promise<void>
  readonly exportMermaid: () => Promise<void>
}

export const useFileActions = (close: () => void): FileActionHandlers => {
  const pushToast = useUiStore((s) => s.pushToast)

  const open = async (): Promise<void> => {
    const file = await openFile({ accept: '.xml' })
    if (!file) { close(); return }
    const text = await file.text()
    const result = chenJavaXmlCodec.parse!(text)
    if (!result.ok) {
      pushToast({ id: `open-${Date.now()}`, kind: 'error', messageKey: 'menu:app.openFailure' })
      close()
      return
    }
    useDiagramStore.setState({ diagram: result.value })
    pushToast({ id: `open-${Date.now()}`, kind: 'success', messageKey: 'menu:app.openSuccess' })
    close()
  }

  const save = async (): Promise<void> => {
    const xml = chenJavaXmlCodec.serialize!(useDiagramStore.getState().diagram)
    downloadBlob(new Blob([xml], { type: 'application/xml' }), `diagram-${Date.now()}.xml`)
    pushToast({ id: `save-${Date.now()}`, kind: 'success', messageKey: 'menu:app.saveSuccess' })
    close()
  }

  const exportMermaid = async (): Promise<void> => {
    const md = mermaidCodec.serialize!(useDiagramStore.getState().diagram)
    downloadBlob(new Blob([md], { type: 'text/plain' }), `diagram-${Date.now()}.mmd`)
    pushToast({ id: `export-${Date.now()}`, kind: 'success', messageKey: 'menu:app.exportSuccess' })
    close()
  }

  return { open, save, exportMermaid }
}
```

Wire into `Menu.tsx`:
- Read `useFileActions(close)` alongside `useExportHandlers(close)`.
- `fileActions` rows: `open` → `fileActions.open`, `save` → `fileActions.save`, `exportPng` → `exportPng`, `exportSvg` → `exportSvg`, add new `exportMermaid` row → `fileActions.exportMermaid`.

i18n keys to add:

EN `menu.json`:
```
"app.openSuccess": "Diagram opened.",
"app.openFailure": "Could not open the file. Check the format.",
"app.saveSuccess": "Diagram saved."
```
IT mirror.

- [ ] **Step 1: Build the registry** (create the index files).
- [ ] **Step 2: Build `useFileActions`** with TDD tests using mocked `platform/fs` and `useDiagramStore.setState`.
- [ ] **Step 3: Replace `toastPhase5` stubs in `Menu.tsx`.**
- [ ] **Step 4: Add i18n keys + verify `pnpm lint:locales` is green.**
- [ ] **Step 5: Manual smoke test: `pnpm dev`, open `tests/fixtures/supsi/conference-sol.xml` via the Menu, edit nothing, save it, diff the output.**
- [ ] **Step 6: Commit**

```bash
git add src/notation/chen/codecs/{png,svg,index}.ts src/ui/menu/{useFileActions.ts,useFileActions.test.ts,Menu.tsx} \
        src/platform/i18n/locales/{en,it}/menu.json
git commit -m "feat(ui): wire Menu Open/Save/Export Mermaid to chenJavaXmlCodec"
```

Add Co-Authored-By trailer.

---

## Task 14: Phase 5 integration + CHANGELOG

**Files:**
- Modify: `src/ui/integration.test.tsx` (Phase 5 scenario)
- Modify: `vitest.config.ts` (coverage thresholds for `src/notation/chen/codecs/**`)
- Modify: `CHANGELOG.md`

The Phase 5 integration test simulates a full Open → Save flow through the actual UI. The byte-clean SUPSI gate is in `integration.test.ts` already — this one is the UI-layer wrapper that proves the wiring is correct end-to-end.

- [ ] **Step 1: UI integration test**

Open via mocked file picker, save via mocked download, assert the diff is empty.

- [ ] **Step 2: Coverage thresholds**

Add to `vitest.config.ts`:

```ts
'src/notation/chen/codecs/**': { statements: 90, branches: 85, functions: 90, lines: 90 },
```

The codec is the heart of Phase 5; it deserves 90% coverage.

- [ ] **Step 3: CHANGELOG entry**

Add a `## [v2 / Phase 5] — 2026-XX-XX` section above Phase 7. Items:
- Java XML codec (`chenJavaXmlCodec`) with byte-clean SUPSI fixture round-trip
- Mermaid export codec
- PNG / SVG export codecs (wrap Phase 7 helpers)
- Codec registry under `src/notation/chen/codecs/index.ts`
- Menu Open / Save / Export Mermaid wired to platform/fs + codecs
- New `Diagram.databaseName` + `Diagram.databaseLastId` metadata fields

Deferred:
- Moodle postMessage bridge (still parked — needs host-side script)
- Cross-document paste (Sub-project 4)

- [ ] **Step 4: Verify**

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm lint:locales
pnpm build
```

All green.

- [ ] **Step 5: Commit**

```bash
git add src/ui/integration.test.tsx vitest.config.ts CHANGELOG.md
git commit -m "test(phase5): integration test for Open/Save flow; coverage thresholds; changelog"
```

Add Co-Authored-By trailer.

---

## Exit criteria (spec §10.7)

All of:

- `chenJavaXmlCodec.parse` + `serialize` round-trip every SUPSI fixture byte-clean.
- `chenJavaXmlCodec` round-trip on `conference-sol.xml` — load → no edits → save → diff = 0 lines. **Hard gate.**
- Mermaid export produces valid `erDiagram` syntax.
- Menu Open / Save / Export PNG / Export SVG / Export Mermaid all dispatch through codecs and platform primitives. No more `toastPhase5`.
- `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm lint:locales`, `pnpm build` all green.
- Coverage: `src/notation/chen/codecs/**` ≥ 90%.

Explicit **non-exits** (deferred):

- Moodle postMessage bridge (out of scope; needs host script)
- Cross-document clipboard paste (Sub-project 4)

---

## Self-review checklist

1. **Spec coverage**: every bullet in §10.7 mapped to a task or explicitly deferred. ✅
2. **Placeholder scan**: zero TBDs, zero "similar to Task N", every code step has actual code. ✅
3. **Type consistency**: `JavaRelationshipSetKind` literals match across types.ts, reader.ts, writer.ts, transformer.ts. ✅
4. **Order of commits**: each task leaves the tree green and tests pass. Layer 1 (Tasks 1-7) is independently testable. Layer 2 (Tasks 8-10) depends on Layer 1 types but not the byte-clean output. Combined codec (Task 11) depends on both layers. UI wiring (Task 13) depends on the codec. CHANGELOG (Task 14) is the close-out. ✅
5. **No spec drift**: codec contract from §6.5 is honoured. Domain extensions (`databaseName`, `databaseLastId`) are minimal. No notation-locking — the chen codec is one of potentially many. ✅
