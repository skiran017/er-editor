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

const diffPos = (a: string, b: string): number => {
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) if (a[i] !== b[i]) return i
  return len
}

describe('Layer 1 byte-clean round-trip — every SUPSI fixture', () => {
  for (const name of FIXTURES) {
    it(`${name}: parse → serialize === input`, () => {
      const input = load(name)
      const model = parseJavaXml(input)
      const lineEnding: '\n' | '\r\n' = input.includes('\r\n') ? '\r\n' : '\n'
      // Extract the exact bytes after </ERDatabaseModel> to pass through as
      // the trailing suffix. This preserves trailing blank lines that some
      // SUPSI fixtures have (e.g. \r\n\r\n).
      const closingTag = '</ERDatabaseModel>'
      const closingIdx = input.lastIndexOf(closingTag)
      const trailingSuffix = closingIdx >= 0 ? input.slice(closingIdx + closingTag.length) : '\n'
      // Normalise the suffix back to LF for passing to the writer (it will
      // convert to CRLF if lineEnding === '\r\n').
      const trailingSuffixLf = trailingSuffix.replace(/\r\n/g, '\n')
      const output = serializeJavaXml(model, { lineEnding, trailingSuffix: trailingSuffixLf })
      if (output !== input) {
        const pos = diffPos(input, output)
        const start = Math.max(0, pos - 100)
        const end = Math.min(Math.max(input.length, output.length), pos + 100)
        console.error(
          `[${name}] First divergence at byte ${pos}:\n` +
          `  input:  ${JSON.stringify(input.slice(start, end))}\n` +
          `  output: ${JSON.stringify(output.slice(start, end))}`
        )
      }
      expect(output).toBe(input)
    })
  }
})
