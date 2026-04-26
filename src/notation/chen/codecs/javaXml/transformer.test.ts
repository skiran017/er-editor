// src/notation/chen/codecs/javaXml/transformer.test.ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { javaToDiagram, diagramToJava } from './transformer'
import type { JavaModel } from './types'
import { parseJavaXml } from './reader'

const FIXTURE_DIR = join(__dirname, '../../../../../tests/fixtures/supsi')
const loadXml = (name: string): string => readFileSync(join(FIXTURE_DIR, name), 'utf8')


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

  it('scales position from the diagram section by the import factor (1.7×)', () => {
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
    // Imported positions are scaled to spread out the tightly-packed Java layout.
    // Raw (50, 60) × 1.7 → scaled (85, 102). Round-trip metadata stores the raw values.
    expect(node.position).toEqual({ x: 85, y: 102 })
  })
})

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

describe('diagramToJava — reverse direction', () => {
  it('round-trips a simple diagram (entity + 1 attribute) through both transformers', () => {
    const original: JavaModel = {
      schema: {
        name: 'T', lastId: 2,
        entities: [
          {
            _kind: 'StrongEntitySet', id: 1, name: 'Person',
            attributes: [
              { _kind: 'SimpleAttribute', id: 2, name: 'name', multiValued: false, derived: false },
            ],
            primaryKey: [2],
          },
        ],
        relationships: [],
        generalizations: [],
      },
      diagram: { positions: new Map([[1, { x: 100, y: 200 }], [2, { x: 150, y: 250 }]]) },
    }
    const diagram = javaToDiagram(original)
    const result = diagramToJava(diagram, { databaseName: 'T' })

    expect(result.schema.entities).toHaveLength(1)
    expect(result.schema.entities[0]!.name).toBe('Person')
    expect(result.schema.entities[0]!.attributes).toHaveLength(1)
    expect(result.schema.entities[0]!.attributes[0]!.name).toBe('name')
    // primaryKey should contain the re-assigned id of the 'name' attribute
    const attrId = result.schema.entities[0]!.attributes[0]!.id
    const entity = result.schema.entities[0]!
    expect(entity._kind === 'StrongEntitySet' && entity.primaryKey).toContain(attrId)
  })

  it('derives RelationshipSetOneToN from two branches with cardinality (1, N)', () => {
    const original: JavaModel = {
      schema: {
        name: 'T', lastId: 4,
        entities: [
          { _kind: 'StrongEntitySet', id: 1, name: 'A', attributes: [], primaryKey: [] },
          { _kind: 'StrongEntitySet', id: 2, name: 'B', attributes: [], primaryKey: [] },
        ],
        relationships: [{
          _kind: 'RelationshipSetOneToN', id: 3, name: 'Owns',
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
    const diagram = javaToDiagram(original)
    const result = diagramToJava(diagram)

    expect(result.schema.relationships).toHaveLength(1)
    expect(result.schema.relationships[0]!._kind).toBe('RelationshipSetOneToN')
    expect(result.schema.relationships[0]!.name).toBe('Owns')
  })

  it('emits TotalGeneralization when isa.isTotal is true', () => {
    const original: JavaModel = {
      schema: {
        name: 'T', lastId: 4,
        entities: [
          { _kind: 'StrongEntitySet', id: 1, name: 'Animal', attributes: [], primaryKey: [] },
          { _kind: 'StrongEntitySet', id: 2, name: 'Dog', attributes: [], primaryKey: [] },
          { _kind: 'StrongEntitySet', id: 3, name: 'Cat', attributes: [], primaryKey: [] },
        ],
        relationships: [],
        generalizations: [{
          _kind: 'TotalGeneralization', id: 4, total: true,
          parent: { _kind: 'StrongEntitySet', refid: 1 },
          children: [
            { _kind: 'StrongEntitySet', refid: 2 },
            { _kind: 'StrongEntitySet', refid: 3 },
          ],
        }],
      },
      diagram: { positions: new Map() },
    }
    const diagram = javaToDiagram(original)
    const result = diagramToJava(diagram)

    expect(result.schema.generalizations).toHaveLength(1)
    expect(result.schema.generalizations[0]!._kind).toBe('TotalGeneralization')
  })

  it('lifecycle: javaToDiagram(m1) → diagramToJava → semantic equality with m1', () => {
    const xml = loadXml('test.xml')
    const m1 = parseJavaXml(xml)
    const diagram = javaToDiagram(m1)
    const m2 = diagramToJava(diagram, { databaseName: m1.schema.name })

    // Entity count + names should match.
    expect(m2.schema.entities).toHaveLength(m1.schema.entities.length)
    const originalNames = m1.schema.entities.map((e) => e.name).sort()
    const resultNames = m2.schema.entities.map((e) => e.name).sort()
    expect(resultNames).toEqual(originalNames)

    // Relationship count + names should match.
    expect(m2.schema.relationships).toHaveLength(m1.schema.relationships.length)
    const origRelNames = m1.schema.relationships.map((r) => r.name).sort()
    const resultRelNames = m2.schema.relationships.map((r) => r.name).sort()
    expect(resultRelNames).toEqual(origRelNames)

    // Generalization count should match.
    expect(m2.schema.generalizations).toHaveLength(m1.schema.generalizations.length)
  })
})
