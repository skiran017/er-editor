import type { Diagram, NodeId, EdgeId, RelationshipNode, EntityRelationshipEdge } from '@/domain/types'
import {
  incidentEdges, isEntityNode, isEntityRelationshipEdge, nodesByKind,
} from '@/domain/graph'
import type { ValidationError, ValidationRule } from '@/notation/types'

const incidentERs = (diagram: Diagram, relId: NodeId): readonly EntityRelationshipEdge[] =>
  incidentEdges(diagram, relId).filter(isEntityRelationshipEdge)

const connectedEntityIds = (diagram: Diagram, relId: NodeId): readonly NodeId[] =>
  incidentERs(diagram, relId).map((e) => e.sourceId === relId ? e.targetId : e.sourceId)

const err = (
  ruleId: string, targetId: NodeId | EdgeId, messageKey: string,
  severity: 'error' | 'warning' = 'error',
  messageParams?: Readonly<Record<string, string>>,
): ValidationError => ({ ruleId, severity, targetId, messageKey, messageParams })

export const relationshipMinTwoEntitiesRule: ValidationRule = {
  id: 'chen.relationship.min-two-entities',
  severity: 'error',
  category: 'relationship',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const r of nodesByKind(diagram, 'relationship')) {
      const count = incidentERs(diagram, r.id).length
      if (count < 2) {
        out.push(err('chen.relationship.min-two-entities', r.id, 'validation.chen.relationship.min-two-entities'))
      }
    }
    return out
  },
}

export const relationshipCardinalityRequiredRule: ValidationRule = {
  id: 'chen.relationship.cardinality-required',
  severity: 'error',
  category: 'relationship',
  check: (diagram) => {
    const VALID = new Set<string>(['1', 'N', 'M'])
    const out: ValidationError[] = []
    for (const r of nodesByKind(diagram, 'relationship')) {
      for (const edge of incidentERs(diagram, r.id)) {
        if (!VALID.has(String(edge.cardinality).trim())) {
          out.push(err('chen.relationship.cardinality-required', r.id, 'validation.chen.relationship.cardinality-required'))
          break
        }
      }
    }
    return out
  },
}

export const relationshipParticipationRequiredRule: ValidationRule = {
  id: 'chen.relationship.participation-required',
  severity: 'error',
  category: 'relationship',
  check: (diagram) => {
    const VALID = new Set<string>(['total', 'partial'])
    const out: ValidationError[] = []
    for (const r of nodesByKind(diagram, 'relationship')) {
      for (const edge of incidentERs(diagram, r.id)) {
        if (!VALID.has(String(edge.participation))) {
          out.push(err('chen.relationship.participation-required', r.id, 'validation.chen.relationship.participation-required'))
          break
        }
      }
    }
    return out
  },
}

export const identifyingRelationshipNeedsWeakRule: ValidationRule = {
  id: 'chen.relationship.identifying-needs-weak',
  severity: 'error',
  category: 'relationship',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const r of nodesByKind(diagram, 'relationship')) {
      if (!r.isIdentifying) continue
      const hasWeak = connectedEntityIds(diagram, r.id)
        .map((id) => diagram.nodesById[id])
        .some((n) => n && isEntityNode(n) && n.isWeak)
      if (!hasWeak) {
        out.push(err('chen.relationship.identifying-needs-weak', r.id, 'validation.chen.relationship.identifying-needs-weak'))
      }
    }
    return out
  },
}

export const nonIdentifyingNotWeakRule: ValidationRule = {
  id: 'chen.relationship.non-identifying-not-weak',
  severity: 'error',
  category: 'relationship',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const r of nodesByKind(diagram, 'relationship')) {
      if (!r.isIdentifying) continue
      const hasWeak = connectedEntityIds(diagram, r.id)
        .map((id) => diagram.nodesById[id])
        .some((n) => n && isEntityNode(n) && n.isWeak)
      if (!hasWeak) {
        out.push(err('chen.relationship.non-identifying-not-weak', r.id, 'validation.chen.relationship.non-identifying-not-weak'))
      }
    }
    return out
  },
}

export const relationshipNameUniqueRule: ValidationRule = {
  id: 'chen.relationship.name-unique',
  severity: 'error',
  category: 'relationship',
  check: (diagram) => {
    const out: ValidationError[] = []
    const groups = new Map<string, RelationshipNode[]>()
    for (const r of nodesByKind(diagram, 'relationship')) {
      const key = r.name.trim().toLowerCase()
      if (key.length === 0) continue
      const list = groups.get(key) ?? []
      list.push(r)
      groups.set(key, list)
    }
    for (const list of groups.values()) {
      if (list.length < 2) continue
      for (const r of list) {
        out.push(err(
          'chen.relationship.name-unique', r.id,
          'validation.chen.relationship.name-unique',
          'error',
          { name: r.name },
        ))
      }
    }
    return out
  },
}

export const recursiveRolesDistinctRule: ValidationRule = {
  id: 'chen.relationship.recursive-roles-distinct',
  severity: 'error',
  category: 'relationship',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const r of nodesByKind(diagram, 'relationship')) {
      const ers = incidentERs(diagram, r.id)
      const groups = new Map<NodeId, EntityRelationshipEdge[]>()
      for (const e of ers) {
        const other = e.sourceId === r.id ? e.targetId : e.sourceId
        const list = groups.get(other) ?? []
        list.push(e)
        groups.set(other, list)
      }
      for (const [, edges] of groups) {
        if (edges.length < 2) continue
        const roles = edges.map((e) => (e.role ?? '').trim())
        if (roles.some((role) => role.length === 0) || new Set(roles).size !== roles.length) {
          for (const e of edges) {
            out.push(err('chen.relationship.recursive-roles-distinct', e.id, 'validation.chen.relationship.recursive-roles-distinct'))
          }
        }
      }
    }
    return out
  },
}

export const relationshipRules: readonly ValidationRule[] = [
  relationshipMinTwoEntitiesRule,
  relationshipCardinalityRequiredRule,
  relationshipParticipationRequiredRule,
  identifyingRelationshipNeedsWeakRule,
  nonIdentifyingNotWeakRule,
  relationshipNameUniqueRule,
  recursiveRolesDistinctRule,
] as const
