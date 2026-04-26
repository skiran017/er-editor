// src/notation/chen/codecs/javaXml/index.ts
// Combined codec: wires Layer 1 (XML ↔ JavaModel) + Layer 2 (JavaModel ↔ Diagram).
import type { Diagram } from '@/domain/types'
import type { Codec, Result } from '../types'
import { parseJavaXml } from './reader'
import { serializeJavaXml, type SerializeOptions } from './writer'
import { javaToDiagram } from './transformer'
import { diagramToJava } from './diagram-to-java'

export interface JavaXmlSerializeOptions {
  readonly trailingNewline?: boolean
  readonly lineEnding?: '\n' | '\r\n'
  readonly trailingSuffix?: string
}

export const chenJavaXmlCodec: Codec = {
  id: 'chen-java-xml',
  displayName: 'Chen ER (Java XML)',
  mode: 'both',
  parse: (raw): Result<Diagram> => {
    try {
      return { ok: true, value: javaToDiagram(parseJavaXml(raw)) }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error : new Error(String(error)) }
    }
  },
  serialize: (d) => serializeJavaXml(diagramToJava(d), { trailingNewline: true }),
}

// Lower-level escape hatch for the round-trip test (which needs to pass through
// the input's exact line-ending + trailing-suffix conventions).
export const serializeChenJavaXml = (d: Diagram, opts: JavaXmlSerializeOptions = {}): string =>
  serializeJavaXml(diagramToJava(d), opts as SerializeOptions)
