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

describe('parseJavaXml — error paths', () => {
  it('throws on malformed XML', () => {
    expect(() => parseJavaXml('<unclosed')).toThrow(/XML parse error/)
  })

  it('throws when the root element is not <ERDatabaseModel>', () => {
    expect(() => parseJavaXml('<?xml version="1.0"?><Foo />')).toThrow(/Expected <ERDatabaseModel>/)
  })

  it('throws on an unknown relationship kind', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ERDatabaseModel>
  <ERDatabaseSchema name="T" lastId="3">
    <EntitySets><StrongEntitySet id="1" name="A"><Attributes /></StrongEntitySet></EntitySets>
    <RelationshipSets>
      <RelationshipSetManyToMany id="2" name="R">
        <Attributes /><Branches /></RelationshipSetManyToMany>
    </RelationshipSets>
    <Generalizations />
  </ERDatabaseSchema>
  <ERDatabaseDiagram />
</ERDatabaseModel>`
    expect(() => parseJavaXml(xml)).toThrow(/Unexpected relationship element/)
  })

  it('throws when totalParticipation is neither "true" nor "false"', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ERDatabaseModel>
  <ERDatabaseSchema name="T" lastId="4">
    <EntitySets>
      <StrongEntitySet id="1" name="A"><Attributes /></StrongEntitySet>
      <StrongEntitySet id="2" name="B"><Attributes /></StrongEntitySet>
    </EntitySets>
    <RelationshipSets>
      <RelationshipSetOneToOne id="3" name="R">
        <Attributes />
        <Branches>
          <RelationshipSetBranch id="4" cardinality="1" totalParticipation="yes" role="">
            <StrongEntitySet refid="1" />
          </RelationshipSetBranch>
        </Branches>
      </RelationshipSetOneToOne>
    </RelationshipSets>
    <Generalizations />
  </ERDatabaseSchema>
  <ERDatabaseDiagram />
</ERDatabaseModel>`
    expect(() => parseJavaXml(xml)).toThrow(/Expected "true" or "false"/)
  })
})
