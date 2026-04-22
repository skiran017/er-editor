import type { Diagram, NodeId, ISAEdge } from '@/domain/types'
import { incidentEdges, isIsaEdge, nodesByKind } from '@/domain/graph'
import type { ValidationError, ValidationRule } from '@/notation/types'

const isaEdgesOf = (diagram: Diagram, isaId: NodeId): readonly ISAEdge[] =>
  incidentEdges(diagram, isaId).filter(isIsaEdge)

const parentEdges = (diagram: Diagram, isaId: NodeId): readonly ISAEdge[] =>
  isaEdgesOf(diagram, isaId).filter((e) => e.role === 'parent' && e.targetId === isaId)

const childEdges = (diagram: Diagram, isaId: NodeId): readonly ISAEdge[] =>
  isaEdgesOf(diagram, isaId).filter((e) => e.role === 'child' && e.sourceId === isaId)

const err = (
  ruleId: string, targetId: NodeId, messageKey: string,
  severity: 'error' | 'warning' = 'error',
): ValidationError => ({ ruleId, severity, targetId, messageKey })

export const isaParentExistsRule: ValidationRule = {
  id: 'chen.generalization.parent-exists',
  severity: 'error',
  category: 'generalization',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const isa of nodesByKind(diagram, 'isa')) {
      const parents = parentEdges(diagram, isa.id)
      if (parents.length !== 1 || !diagram.nodesById[parents[0]!.sourceId]) {
        out.push(err('chen.generalization.parent-exists', isa.id, 'validation.chen.generalization.parent-exists'))
      }
    }
    return out
  },
}

export const isaHasChildrenRule: ValidationRule = {
  id: 'chen.generalization.has-children',
  severity: 'error',
  category: 'generalization',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const isa of nodesByKind(diagram, 'isa')) {
      if (childEdges(diagram, isa.id).length === 0) {
        out.push(err('chen.generalization.has-children', isa.id, 'validation.chen.generalization.has-children'))
      }
    }
    return out
  },
}

export const isaSingleChildWarningRule: ValidationRule = {
  id: 'chen.generalization.single-child-warning',
  severity: 'warning',
  category: 'generalization',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const isa of nodesByKind(diagram, 'isa')) {
      if (childEdges(diagram, isa.id).length === 1) {
        out.push(err(
          'chen.generalization.single-child-warning', isa.id,
          'validation.chen.generalization.single-child-warning',
          'warning',
        ))
      }
    }
    return out
  },
}

export const generalizationRules: readonly ValidationRule[] = [
  isaParentExistsRule,
  isaHasChildrenRule,
  isaSingleChildWarningRule,
] as const
