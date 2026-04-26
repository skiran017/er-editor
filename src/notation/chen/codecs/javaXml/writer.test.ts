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
