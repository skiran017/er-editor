// src/notation/chen/codecs/types.ts
// Codec contract — spec §6.5
import type { Diagram } from '@/domain/types'

export type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E }

export interface Codec {
  readonly id: string
  readonly displayName: string
  readonly mode: 'import' | 'export' | 'both'
  parse?: (raw: string) => Result<Diagram>
  serialize?: (d: Diagram) => string
}
