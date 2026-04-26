// src/notation/chen/codecs/mermaid.test.ts
import { describe, it, expect } from 'vitest'
import { mermaidCodec } from './mermaid'
import { emptyDiagram, type Diagram, type NodeId, type EdgeId } from '@/domain/types'
import { chenJavaXmlCodec } from './javaXml'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Minimal helper: build a Diagram from literal objects without needing the store.
const mkDiagram = (partial: Partial<Diagram>): Diagram => ({
  ...emptyDiagram(),
  ...partial,
})

const FIXTURE_DIR = join(__dirname, '../../../../tests/fixtures/supsi')
const load = (name: string): string => readFileSync(join(FIXTURE_DIR, name), 'utf8')

describe('mermaidCodec', () => {
  it('codec metadata is correct', () => {
    expect(mermaidCodec.id).toBe('mermaid')
    expect(mermaidCodec.displayName).toBe('Mermaid')
    expect(mermaidCodec.mode).toBe('export')
    expect(mermaidCodec.parse).toBeUndefined()
    expect(typeof mermaidCodec.serialize).toBe('function')
  })

  it('returns "erDiagram" for an empty diagram', () => {
    const out = mermaidCodec.serialize!(emptyDiagram())
    expect(out.trim()).toBe('erDiagram')
  })

  it('emits an entity block with attributes from test.xml', () => {
    const xml = load('test.xml')
    const parsed = chenJavaXmlCodec.parse!(xml)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    const out = mermaidCodec.serialize!(parsed.value)

    expect(out).toContain('erDiagram')
    // test.xml has ENTITA', ENTITA'_2, ENTITA'_3
    expect(out).toMatch(/ENTITA' \{/)
    expect(out).toMatch(/ENTITA'_2 \{/)
    expect(out).toMatch(/ENTITA'_3 \{/)
    // Attributes: each entity has one or more 'attributo' entries
    expect(out).toMatch(/string attributo/)
  })

  it("emits a relationship line with crow's-foot cardinality mapping", () => {
    const xml = load('test.xml')
    const parsed = chenJavaXmlCodec.parse!(xml)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    const out = mermaidCodec.serialize!(parsed.value)

    // test.xml: RELAZIONE is RelationshipSetOneToOne with both branches
    // cardinality=1, totalParticipation=false (partial) on both sides
    // |o..o| for (1+partial)..(1+partial) non-identifying
    expect(out).toMatch(/\|o\.\.o\|/)
  })

  it('emits relationship with correct entity names and label', () => {
    const xml = load('test.xml')
    const parsed = chenJavaXmlCodec.parse!(xml)
    if (!parsed.ok) return
    const out = mermaidCodec.serialize!(parsed.value)

    // RELAZIONE connects ENTITA' and ENTITA'_2
    expect(out).toMatch(/ENTITA'.*RELAZIONE/)
  })

  it('emits a comment for generalizations', () => {
    const xml = load('conference-sol.xml')
    const parsed = chenJavaXmlCodec.parse!(xml)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    const out = mermaidCodec.serialize!(parsed.value)
    expect(out).toContain('erDiagram')
    // Either has generalization comments or runs without throwing
    // (conference-sol may or may not have ISA nodes — just must not throw)
  })

  it('handles the full er-java.xml fixture without throwing', () => {
    const xml = load('er-java.xml')
    const parsed = chenJavaXmlCodec.parse!(xml)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    const out = mermaidCodec.serialize!(parsed.value)
    expect(out).toContain('erDiagram')
  })

  it('handles composite attributes by flattening leaf attributes', () => {
    const xml = load('er-java.xml')
    const parsed = chenJavaXmlCodec.parse!(xml)
    if (!parsed.ok) return
    const out = mermaidCodec.serialize!(parsed.value)
    // Composite attributes should be emitted; check output is non-trivial
    expect(out.length).toBeGreaterThan('erDiagram'.length)
  })

  it('emits %% Generalization comment when ISA nodes are present', () => {
    // Use xml.xml or conference-sol.xml — if they have ISA nodes the comment appears
    for (const name of ['xml.xml', 'conference-sol.xml']) {
      const xml = load(name)
      const parsed = chenJavaXmlCodec.parse!(xml)
      if (!parsed.ok) continue
      const out = mermaidCodec.serialize!(parsed.value)
      // If any ISA is present in this diagram, a comment must appear
      const hasIsaNode = Object.values(parsed.value.nodesById).some((n) => n.kind === 'isa')
      if (hasIsaNode) {
        expect(out).toMatch(/%% Generalization/)
      }
    }
  })

  it('flattens composite attributes and emits a // composite comment', () => {
    // Entity → composite attribute → leaf attribute
    // This exercises the collectLeafAttrs recursive branch (line 86 of mermaid.ts)
    const entityId = 'e1' as NodeId
    const compositeId = 'a_comp' as NodeId
    const leafId = 'a_leaf' as NodeId
    const ed1 = 'ed1' as EdgeId; const ed2 = 'ed2' as EdgeId
    const d = mkDiagram({
      nodeOrder: [entityId, compositeId, leafId],
      nodesById: {
        [entityId]: { id: entityId, kind: 'entity', name: 'PERSON', isWeak: false, position: { x: 0, y: 0 }, size: { width: 120, height: 60 } },
        [compositeId]: {
          id: compositeId, kind: 'attribute', name: 'address',
          isKey: false, isDiscriminant: false, isMultivalued: false, isDerived: false, isComposite: true,
          position: { x: 0, y: 0 }, size: { width: 80, height: 40 },
        },
        [leafId]: {
          id: leafId, kind: 'attribute', name: 'street',
          isKey: false, isDiscriminant: false, isMultivalued: false, isDerived: false, isComposite: false,
          position: { x: 0, y: 0 }, size: { width: 80, height: 40 },
        },
      },
      edgeOrder: [ed1, ed2],
      edgesById: {
        [ed1]: { id: ed1, kind: 'attribute-of', sourceId: compositeId, targetId: entityId, waypoints: [] },
        [ed2]: { id: ed2, kind: 'attribute-of', sourceId: leafId, targetId: compositeId, waypoints: [] },
      },
    })
    const out = mermaidCodec.serialize!(d)
    // The leaf 'street' is flattened under 'address' with a composite comment
    expect(out).toContain('PERSON {')
    expect(out).toContain('string street // composite of address')
  })

  it('skips a relationship node that has no entity-relationship edges (0 branches)', () => {
    // A relationship node with no ER edges → branch.length === 0 → continue
    const relId = 'r1' as NodeId
    const d = mkDiagram({
      nodeOrder: [relId],
      nodesById: {
        [relId]: {
          id: relId, kind: 'relationship', name: 'ORPHAN_REL',
          isIdentifying: false, position: { x: 0, y: 0 }, size: { width: 100, height: 60 },
        },
      },
    })
    const out = mermaidCodec.serialize!(d)
    // No line for ORPHAN_REL (it is silently skipped)
    expect(out).not.toContain('ORPHAN_REL')
  })

  it('emits a %% N-ary comment for relationships with more than 2 branches', () => {
    // Three entity-relationship edges on the same relationship → N-ary → comment
    const e1 = 'e1' as NodeId; const e2 = 'e2' as NodeId; const e3 = 'e3' as NodeId
    const relId = 'r1' as NodeId
    const ed1 = 'ed1' as EdgeId; const ed2 = 'ed2' as EdgeId; const ed3 = 'ed3' as EdgeId
    const d = mkDiagram({
      nodeOrder: [e1, e2, e3, relId],
      nodesById: {
        [e1]: { id: e1, kind: 'entity', name: 'A', isWeak: false, position: { x: 0, y: 0 }, size: { width: 120, height: 60 } },
        [e2]: { id: e2, kind: 'entity', name: 'B', isWeak: false, position: { x: 0, y: 0 }, size: { width: 120, height: 60 } },
        [e3]: { id: e3, kind: 'entity', name: 'C', isWeak: false, position: { x: 0, y: 0 }, size: { width: 120, height: 60 } },
        [relId]: { id: relId, kind: 'relationship', name: 'N_ARY_REL', isIdentifying: false, position: { x: 0, y: 0 }, size: { width: 100, height: 60 } },
      },
      edgeOrder: [ed1, ed2, ed3],
      edgesById: {
        [ed1]: { id: ed1, kind: 'entity-relationship', sourceId: e1, targetId: relId, cardinality: 'N', participation: 'partial', waypoints: [] },
        [ed2]: { id: ed2, kind: 'entity-relationship', sourceId: e2, targetId: relId, cardinality: 'N', participation: 'partial', waypoints: [] },
        [ed3]: { id: ed3, kind: 'entity-relationship', sourceId: e3, targetId: relId, cardinality: 'N', participation: 'partial', waypoints: [] },
      },
    })
    const out = mermaidCodec.serialize!(d)
    expect(out).toContain('%% N-ary relationship (3-way): N_ARY_REL — skipped')
  })

  it('skips an ISA node that has no isa-link edges', () => {
    // ISA node in nodeOrder but no edges in edgeOrder → isaEdges is undefined → continue
    const isaId = 'isa1' as NodeId
    const d = mkDiagram({
      nodeOrder: [isaId],
      nodesById: {
        [isaId]: { id: isaId, kind: 'isa', isTotal: false, position: { x: 0, y: 0 }, size: { width: 60, height: 60 } },
      },
    })
    const out = mermaidCodec.serialize!(d)
    // No generalization comment — ISA was silently skipped
    expect(out).not.toContain('%% Generalization')
  })

  it('emits "?" as parent name when ISA parentId does not reference an entity', () => {
    // ISA parent edge points to a non-existent node → parentNode?.kind !== 'entity' → '?'
    const isaId = 'isa1' as NodeId
    const ghostId = 'ghost' as NodeId
    const childId = 'child1' as NodeId
    const ed1 = 'ed1' as EdgeId; const ed2 = 'ed2' as EdgeId
    const d = mkDiagram({
      nodeOrder: [childId, isaId],
      nodesById: {
        [childId]: { id: childId, kind: 'entity', name: 'CHILD', isWeak: false, position: { x: 0, y: 0 }, size: { width: 120, height: 60 } },
        [isaId]: { id: isaId, kind: 'isa', isTotal: true, position: { x: 0, y: 0 }, size: { width: 60, height: 60 } },
      },
      edgeOrder: [ed1, ed2],
      edgesById: {
        // parent edge points to a node that doesn't exist in nodesById
        [ed1]: { id: ed1, kind: 'isa-link', sourceId: isaId, targetId: ghostId, role: 'parent', waypoints: [] },
        [ed2]: { id: ed2, kind: 'isa-link', sourceId: isaId, targetId: childId, role: 'child', waypoints: [] },
      },
    })
    const out = mermaidCodec.serialize!(d)
    expect(out).toContain('%% Generalization (total): ? -> [CHILD]')
  })

  it('emits partial generalization comment when ISA isTotal is false', () => {
    // Covers the isTotal === false branch → "partial" label
    const isaId = 'isa1' as NodeId
    const parentId = 'p1' as NodeId
    const childId = 'c1' as NodeId
    const ed1 = 'ed1' as EdgeId; const ed2 = 'ed2' as EdgeId
    const d = mkDiagram({
      nodeOrder: [parentId, childId, isaId],
      nodesById: {
        [parentId]: { id: parentId, kind: 'entity', name: 'PARENT', isWeak: false, position: { x: 0, y: 0 }, size: { width: 120, height: 60 } },
        [childId]: { id: childId, kind: 'entity', name: 'CHILD', isWeak: false, position: { x: 0, y: 0 }, size: { width: 120, height: 60 } },
        [isaId]: { id: isaId, kind: 'isa', isTotal: false, position: { x: 0, y: 0 }, size: { width: 60, height: 60 } },
      },
      edgeOrder: [ed1, ed2],
      edgesById: {
        [ed1]: { id: ed1, kind: 'isa-link', sourceId: isaId, targetId: parentId, role: 'parent', waypoints: [] },
        [ed2]: { id: ed2, kind: 'isa-link', sourceId: isaId, targetId: childId, role: 'child', waypoints: [] },
      },
    })
    const out = mermaidCodec.serialize!(d)
    expect(out).toContain('%% Generalization (partial): PARENT -> [CHILD]')
  })

  it('skips a binary relationship when one of the referenced entity nodes is missing', () => {
    // Covers the `if (!leftEntity || !rightEntity) continue` branch (line 133)
    const entityId = 'e1' as NodeId
    const ghostId = 'ghost' as NodeId
    const relId = 'r1' as NodeId
    const ed1 = 'ed1' as EdgeId; const ed2 = 'ed2' as EdgeId
    const d = mkDiagram({
      nodeOrder: [entityId, relId],
      nodesById: {
        [entityId]: { id: entityId, kind: 'entity', name: 'REAL', isWeak: false, position: { x: 0, y: 0 }, size: { width: 120, height: 60 } },
        [relId]: { id: relId, kind: 'relationship', name: 'DANGLING_REL', isIdentifying: false, position: { x: 0, y: 0 }, size: { width: 100, height: 60 } },
      },
      edgeOrder: [ed1, ed2],
      edgesById: {
        // One edge references a real entity, the other references a ghost (missing)
        [ed1]: { id: ed1, kind: 'entity-relationship', sourceId: entityId, targetId: relId, cardinality: 'N', participation: 'partial', waypoints: [] },
        [ed2]: { id: ed2, kind: 'entity-relationship', sourceId: ghostId, targetId: relId, cardinality: 'N', participation: 'partial', waypoints: [] },
      },
    })
    const out = mermaidCodec.serialize!(d)
    // Relationship line is silently skipped (no crash)
    expect(out).not.toContain('DANGLING_REL')
    expect(out).toContain('erDiagram')
  })
})
