import type { ValidationError, ValidationRule } from '@/notation/types'

export const danglingEdgeRule: ValidationRule = {
  id: 'chen.structural.dangling-edge',
  severity: 'error',
  category: 'structural',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const edgeId of diagram.edgeOrder) {
      const edge = diagram.edgesById[edgeId]
      if (!edge) continue
      if (!diagram.nodesById[edge.sourceId] || !diagram.nodesById[edge.targetId]) {
        out.push({
          ruleId: 'chen.structural.dangling-edge',
          severity: 'error',
          targetId: edge.id,
          messageKey: 'validation.chen.structural.dangling-edge',
        })
      }
    }
    return out
  },
}

export const structuralRules: readonly ValidationRule[] = [danglingEdgeRule] as const
