import type { Diagram, EntityNode, NodeId, AttributeNode, RelationshipNode, EntityRelationshipEdge } from '@/domain/types'
import {
  incidentEdges, isAttributeEdge, isAttributeNode,
  isEntityRelationshipEdge, isIsaEdge, isRelationshipNode, nodesByKind,
} from '@/domain/graph'
import type { ValidationError, ValidationRule } from '@/notation/types'

// ——— Helpers ———

const isIsaChild = (diagram: Diagram, entityId: NodeId): boolean => {
  for (const edge of incidentEdges(diagram, entityId)) {
    if (isIsaEdge(edge) && edge.role === 'child' && edge.targetId === entityId) return true
  }
  return false
}

const attributesOf = (diagram: Diagram, entityId: NodeId): readonly AttributeNode[] => {
  const out: AttributeNode[] = []
  for (const edge of incidentEdges(diagram, entityId)) {
    if (!isAttributeEdge(edge) || edge.targetId !== entityId) continue
    const src = diagram.nodesById[edge.sourceId]
    if (src && isAttributeNode(src)) out.push(src)
  }
  return out
}

const identifyingRelationshipsOf = (
  diagram: Diagram,
  entityId: NodeId,
): readonly { rel: RelationshipNode; edge: EntityRelationshipEdge }[] => {
  const out: { rel: RelationshipNode; edge: EntityRelationshipEdge }[] = []
  for (const edge of incidentEdges(diagram, entityId)) {
    if (!isEntityRelationshipEdge(edge)) continue
    const otherId = edge.sourceId === entityId ? edge.targetId : edge.sourceId
    const other = diagram.nodesById[otherId]
    if (other && isRelationshipNode(other) && other.isIdentifying) out.push({ rel: other, edge })
  }
  return out
}

const err = (
  ruleId: string, targetId: NodeId, messageKey: string,
  severity: 'error' | 'warning' = 'error',
  messageParams?: Readonly<Record<string, string>>,
): ValidationError => ({ ruleId, severity, targetId, messageKey, messageParams })

// ——— Rules ———

export const entityMustHaveKeyRule: ValidationRule = {
  id: 'chen.entity.must-have-key',
  severity: 'error',
  category: 'entity',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const e of nodesByKind(diagram, 'entity')) {
      if (e.isWeak) continue
      if (isIsaChild(diagram, e.id)) continue
      const attrs = attributesOf(diagram, e.id)
      if (!attrs.some((a) => a.isKey)) {
        out.push(err('chen.entity.must-have-key', e.id, 'validation.chen.entity.must-have-key'))
      }
    }
    return out
  },
}

export const weakEntityMissingDiscriminantRule: ValidationRule = {
  id: 'chen.entity.weak-missing-discriminant',
  severity: 'error',
  category: 'entity',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const e of nodesByKind(diagram, 'entity')) {
      if (!e.isWeak) continue
      const attrs = attributesOf(diagram, e.id)
      if (!attrs.some((a) => a.isDiscriminant)) {
        out.push(err('chen.entity.weak-missing-discriminant', e.id, 'validation.chen.entity.weak-missing-discriminant'))
      }
    }
    return out
  },
}

export const entityMustHaveAttributeRule: ValidationRule = {
  id: 'chen.entity.must-have-attribute',
  severity: 'error',
  category: 'entity',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const e of nodesByKind(diagram, 'entity')) {
      if (isIsaChild(diagram, e.id)) continue
      if (attributesOf(diagram, e.id).length === 0) {
        out.push(err('chen.entity.must-have-attribute', e.id, 'validation.chen.entity.must-have-attribute'))
      }
    }
    return out
  },
}

export const weakEntityTotalParticipationRule: ValidationRule = {
  id: 'chen.entity.weak-total-participation',
  severity: 'error',
  category: 'entity',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const e of nodesByKind(diagram, 'entity')) {
      if (!e.isWeak) continue
      for (const { edge } of identifyingRelationshipsOf(diagram, e.id)) {
        if (edge.participation !== 'total') {
          out.push(err('chen.entity.weak-total-participation', e.id, 'validation.chen.entity.weak-total-participation'))
          break
        }
      }
    }
    return out
  },
}

export const weakEntityNotOn1SideRule: ValidationRule = {
  id: 'chen.entity.weak-not-on-1-side',
  severity: 'error',
  category: 'entity',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const e of nodesByKind(diagram, 'entity')) {
      if (!e.isWeak) continue
      for (const { edge } of identifyingRelationshipsOf(diagram, e.id)) {
        if (edge.cardinality === '1') {
          out.push(err('chen.entity.weak-not-on-1-side', e.id, 'validation.chen.entity.weak-not-on-1-side'))
          break
        }
      }
    }
    return out
  },
}

export const weakEntitySingleIdentifyingRule: ValidationRule = {
  id: 'chen.entity.weak-single-identifying',
  severity: 'error',
  category: 'entity',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const e of nodesByKind(diagram, 'entity')) {
      if (!e.isWeak) continue
      const ids = new Set(identifyingRelationshipsOf(diagram, e.id).map((x) => x.rel.id))
      if (ids.size !== 1) {
        out.push(err(
          'chen.entity.weak-single-identifying', e.id,
          'validation.chen.entity.weak-single-identifying',
          'error',
          { count: String(ids.size) },
        ))
      }
    }
    return out
  },
}

export const entityNameUniqueRule: ValidationRule = {
  id: 'chen.entity.name-unique',
  severity: 'error',
  category: 'entity',
  check: (diagram) => {
    const out: ValidationError[] = []
    const groups = new Map<string, EntityNode[]>()
    for (const e of nodesByKind(diagram, 'entity')) {
      const key = e.name.trim().toLowerCase()
      if (key.length === 0) continue
      const list = groups.get(key) ?? []
      list.push(e)
      groups.set(key, list)
    }
    for (const list of groups.values()) {
      if (list.length < 2) continue
      for (const e of list) {
        out.push(err(
          'chen.entity.name-unique', e.id,
          'validation.chen.entity.name-unique',
          'error',
          { name: e.name },
        ))
      }
    }
    return out
  },
}

export const entityNameNonEmptyRule: ValidationRule = {
  id: 'chen.entity.name-non-empty',
  severity: 'error',
  category: 'entity',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const e of nodesByKind(diagram, 'entity')) {
      if (e.name.trim().length === 0) {
        out.push(err('chen.entity.name-non-empty', e.id, 'validation.chen.entity.name-non-empty'))
      }
    }
    return out
  },
}

export const orphanEntityWarningRule: ValidationRule = {
  id: 'chen.entity.orphan-warning',
  severity: 'warning',
  category: 'entity',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const e of nodesByKind(diagram, 'entity')) {
      const edges = incidentEdges(diagram, e.id)
      const hasRelationship = edges.some((edge) => {
        if (!isEntityRelationshipEdge(edge)) return false
        const otherId = edge.sourceId === e.id ? edge.targetId : edge.sourceId
        const other = diagram.nodesById[otherId]
        return !!other && isRelationshipNode(other)
      })
      const hasIsaParticipation = edges.some(isIsaEdge)
      if (!hasRelationship && !hasIsaParticipation) {
        out.push(err('chen.entity.orphan-warning', e.id, 'validation.chen.entity.orphan-warning', 'warning'))
      }
    }
    return out
  },
}

export const weakEntityNoKeyRule: ValidationRule = {
  id: 'chen.entity.weak-no-key',
  severity: 'error',
  category: 'entity',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const e of nodesByKind(diagram, 'entity')) {
      if (!e.isWeak) continue
      if (attributesOf(diagram, e.id).some((a) => a.isKey)) {
        out.push(err('chen.entity.weak-no-key', e.id, 'validation.chen.entity.weak-no-key'))
      }
    }
    return out
  },
}

export const entityRules: readonly ValidationRule[] = [
  entityMustHaveKeyRule,
  weakEntityMissingDiscriminantRule,
  entityMustHaveAttributeRule,
  weakEntityTotalParticipationRule,
  weakEntityNotOn1SideRule,
  weakEntitySingleIdentifyingRule,
  entityNameUniqueRule,
  entityNameNonEmptyRule,
  orphanEntityWarningRule,
  weakEntityNoKeyRule,
] as const
