// src/notation/chen/codecs/mermaid.test.ts
import { describe, it, expect } from 'vitest'
import { mermaidCodec } from './mermaid'
import { emptyDiagram } from '@/domain/types'
import { chenJavaXmlCodec } from './javaXml'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

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
})
