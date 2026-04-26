// src/notation/chen/codecs/index.ts
import { chenJavaXmlCodec } from './javaXml'
import { mermaidCodec } from './mermaid'
import type { Codec } from './types'

export const codecs: readonly Codec[] = [chenJavaXmlCodec, mermaidCodec]
export const codecById = (id: string): Codec | undefined =>
  codecs.find((c) => c.id === id)
export { chenJavaXmlCodec, mermaidCodec }
export type { Codec, Result } from './types'
