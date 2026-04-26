// src/notation/chen/codecs/javaXml/integration.test.ts
// HARD ACCEPTANCE GATE (spec §10.7): every SUPSI fixture must round-trip
// BYTE-CLEAN through the full codec stack:
//   xml string → parseJavaXml → javaToDiagram → diagramToJava → serializeJavaXml → xml string
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { chenJavaXmlCodec, serializeChenJavaXml } from './index'

const FIXTURE_DIR = join(__dirname, '../../../../../tests/fixtures/supsi')
const load = (name: string): string => readFileSync(join(FIXTURE_DIR, name), 'utf8')

const detectFormat = (input: string): {
  trailingNewline: boolean
  lineEnding: '\n' | '\r\n'
  trailingSuffix?: string
} => {
  const lineEnding: '\n' | '\r\n' = input.includes('\r\n') ? '\r\n' : '\n'
  // Match exactly the trailing whitespace after </ERDatabaseModel>.
  const m = input.match(/<\/ERDatabaseModel>([\r\n]*)$/)
  // Normalize to LF: serializeJavaXml builds with LF internally and converts
  // to CRLF at the end via a global replace, so the suffix must be in LF form
  // to avoid double-converting \r\n → \r\r\n.
  const rawSuffix = m ? m[1] : ''
  const trailingSuffix = rawSuffix.replace(/\r\n/g, '\n')
  return { trailingNewline: trailingSuffix.length > 0, lineEnding, trailingSuffix }
}

const FIXTURES = [
  'er-diagram-java-1767873101060.xml',
  'er-java.xml',
  'test.xml',
  'xml.xml',
  'conference-sol.xml',
] as const

describe('chenJavaXmlCodec — SUPSI byte-clean round-trip (HARD GATE)', () => {
  for (const name of FIXTURES) {
    it(`${name}: parse → serialize === input`, () => {
      const input = load(name)
      const parsed = chenJavaXmlCodec.parse!(input)
      expect(parsed.ok).toBe(true)
      if (!parsed.ok) return
      const fmt = detectFormat(input)
      const output = serializeChenJavaXml(parsed.value, fmt)
      expect(output).toBe(input)
    })
  }
})
