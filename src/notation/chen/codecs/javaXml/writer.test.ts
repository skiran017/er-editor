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

describe('serializeJavaXml — coverage gaps', () => {
  it('emits TotalGeneralization tag (not Generalization) when _kind is TotalGeneralization', () => {
    const m: JavaModel = {
      schema: {
        name: 'T', lastId: 3,
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
    const out = serializeJavaXml(m)
    expect(out).toContain('<TotalGeneralization id="3" total="true">')
    expect(out).toContain('</TotalGeneralization>')
    expect(out).not.toContain('<Generalization ')
  })

  it('emits CompositeAttribute with non-empty children wrapped in <Children>', () => {
    const m: JavaModel = {
      schema: {
        name: 'T', lastId: 3,
        entities: [{
          _kind: 'StrongEntitySet', id: 1, name: 'E',
          attributes: [{
            _kind: 'CompositeAttribute', id: 2, name: 'addr',
            multiValued: false, derived: false,
            children: [{
              _kind: 'SimpleAttribute', id: 3, name: 'street',
              multiValued: false, derived: false,
            }],
          }],
          primaryKey: [],
        }],
        relationships: [], generalizations: [],
      },
      diagram: { positions: new Map() },
    }
    const out = serializeJavaXml(m)
    expect(out).toContain('<CompositeAttribute id="2" name="addr" multiValued="false" derived="false">')
    expect(out).toContain('<Children>')
    expect(out).toContain('<SimpleAttribute id="3" name="street" multiValued="false" derived="false" />')
    expect(out).toContain('</Children>')
    expect(out).toContain('</CompositeAttribute>')
  })

  it('emits empty CompositeAttribute as self-closing', () => {
    const m: JavaModel = {
      schema: {
        name: 'T', lastId: 2,
        entities: [{
          _kind: 'StrongEntitySet', id: 1, name: 'E',
          attributes: [{
            _kind: 'CompositeAttribute', id: 2, name: 'addr',
            multiValued: false, derived: false,
            children: [],
          }],
          primaryKey: [],
        }],
        relationships: [], generalizations: [],
      },
      diagram: { positions: new Map() },
    }
    const out = serializeJavaXml(m)
    expect(out).toContain('<CompositeAttribute id="2" name="addr" multiValued="false" derived="false" />')
    expect(out).not.toContain('<Children>')
  })

  it('emits a WeakEntitySet with Discriminant refs', () => {
    const m: JavaModel = {
      schema: {
        name: 'T', lastId: 2,
        entities: [{
          _kind: 'WeakEntitySet', id: 1, name: 'W',
          attributes: [{ _kind: 'SimpleAttribute', id: 2, name: 'd', multiValued: false, derived: false }],
          discriminant: [2],
        }],
        relationships: [], generalizations: [],
      },
      diagram: { positions: new Map() },
    }
    const out = serializeJavaXml(m)
    expect(out).toContain('<WeakEntitySet id="1" name="W">')
    expect(out).toContain('<Discriminant>')
    expect(out).toContain('<SimpleAttribute refid="2" />')
    expect(out).toContain('</Discriminant>')
    expect(out).toContain('</WeakEntitySet>')
  })

})

describe('serializeJavaXml — options', () => {
  it('omits the final newline when trailingNewline is false', () => {
    const m: JavaModel = {
      schema: { name: 'T', lastId: 0, entities: [], relationships: [], generalizations: [] },
      diagram: { positions: new Map() },
    }
    const withNl = serializeJavaXml(m)
    const withoutNl = serializeJavaXml(m, { trailingNewline: false })
    expect(withNl.endsWith('\n')).toBe(true)
    expect(withoutNl.endsWith('\n')).toBe(false)
    // Body content must be identical except for the trailing newline.
    expect(withNl).toBe(withoutNl + '\n')
  })
})

describe('serializeJavaXml — diagram section', () => {
  it('emits diagram positions in Map insertion order with correct element names', () => {
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
      // Insert id=2 first, then id=1: that insertion order must be preserved
      diagram: { positions: new Map([[2, { x: 100, y: 200 }], [1, { x: 50, y: 60 }]]) },
    }
    const out = serializeJavaXml(m)
    // 2 (SimpleAttribute) appears BEFORE 1 (StrongEntitySet) because it was
    // inserted first into the Map — writer preserves Map iteration order.
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
})
