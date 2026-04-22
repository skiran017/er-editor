import type { NotationPlugin, ValidationError } from '../types'
import type { Diagram, NodeKind, EdgeKind } from '@/domain/types'
import { chenToolbar } from './toolbar'
import { validateChen } from './rules'

const groupByTarget = (
  all: readonly ValidationError[],
): Record<string, readonly ValidationError[]> => {
  const out: Record<string, ValidationError[]> = {}
  for (const err of all) {
    const key = err.targetId as string
    ;(out[key] ??= []).push(err)
  }
  return out
}

export const chenPlugin: NotationPlugin = {
  id: 'chen',
  label: 'Chen (Entity-Relationship)',
  nodeTypes: {} as Record<NodeKind, never>,
  edgeTypes: {} as Record<EdgeKind, never>,
  tools: chenToolbar,
  defaults: {
    entitySize: { width: 120, height: 60 },
    relationshipSize: { width: 140, height: 70 },
    attributeSize: { width: 90, height: 50 },
    isaSize: { width: 100, height: 60 },
    edgeType: 'smoothstep',
  },
  validate: (d: Diagram) => groupByTarget(validateChen(d)),
  codecs: {
    nativeJson: {
      id: 'chen-native-json',
      label: 'Chen native JSON',
      mimeType: 'application/json',
      fileExtension: 'json',
      role: 'import-export',
    },
  },
}
