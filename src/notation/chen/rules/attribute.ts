import type { Diagram, NodeId, AttributeNode, AttributeEdge } from '@/domain/types'
import {
  incidentEdges, isAttributeEdge, isAttributeNode, isEntityNode,
  isRelationshipNode, nodesByKind,
} from '@/domain/graph'
import type { ValidationError, ValidationRule } from '@/notation/types'

const outboundAttrEdges = (diagram: Diagram, attrId: NodeId): readonly AttributeEdge[] =>
  incidentEdges(diagram, attrId).filter(isAttributeEdge).filter((e) => e.sourceId === attrId)

const parentOf = (diagram: Diagram, attrId: NodeId) => {
  const edges = outboundAttrEdges(diagram, attrId)
  if (edges.length !== 1) return null
  return diagram.nodesById[edges[0]!.targetId] ?? null
}

const err = (
  ruleId: string, targetId: NodeId, messageKey: string,
  severity: 'error' | 'warning' = 'error',
  messageParams?: Readonly<Record<string, string>>,
): ValidationError => ({ ruleId, severity, targetId, messageKey, messageParams })

export const attributeSingleParentRule: ValidationRule = {
  id: 'chen.attribute.single-parent',
  severity: 'error',
  category: 'attribute',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const a of nodesByKind(diagram, 'attribute')) {
      const edges = outboundAttrEdges(diagram, a.id)
      if (edges.length !== 1) {
        out.push(err('chen.attribute.single-parent', a.id, 'validation.chen.attribute.single-parent'))
      }
    }
    return out
  },
}

export const attributeNoDualParentRule: ValidationRule = {
  id: 'chen.attribute.no-dual-parent',
  severity: 'error',
  category: 'attribute',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const a of nodesByKind(diagram, 'attribute')) {
      const parents = outboundAttrEdges(diagram, a.id)
        .map((e) => diagram.nodesById[e.targetId])
        .filter((n): n is NonNullable<typeof n> => !!n)
      const onEntity = parents.some(isEntityNode)
      const onRelationship = parents.some(isRelationshipNode)
      if (onEntity && onRelationship) {
        out.push(err('chen.attribute.no-dual-parent', a.id, 'validation.chen.attribute.no-dual-parent'))
      }
    }
    return out
  },
}

export const discriminantWeakOnlyRule: ValidationRule = {
  id: 'chen.attribute.discriminant-weak-only',
  severity: 'error',
  category: 'attribute',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const a of nodesByKind(diagram, 'attribute')) {
      if (!a.isDiscriminant) continue
      const parent = parentOf(diagram, a.id)
      if (!parent) continue
      const ok = isEntityNode(parent) && parent.isWeak
      if (!ok) {
        out.push(err('chen.attribute.discriminant-weak-only', a.id, 'validation.chen.attribute.discriminant-weak-only'))
      }
    }
    return out
  },
}

export const attributeNotKeyAndDerivedRule: ValidationRule = {
  id: 'chen.attribute.not-key-and-derived',
  severity: 'error',
  category: 'attribute',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const a of nodesByKind(diagram, 'attribute')) {
      if (a.isKey && a.isDerived) {
        out.push(err('chen.attribute.not-key-and-derived', a.id, 'validation.chen.attribute.not-key-and-derived'))
      }
    }
    return out
  },
}

export const keyNotMultivaluedRule: ValidationRule = {
  id: 'chen.attribute.key-not-multivalued',
  severity: 'error',
  category: 'attribute',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const a of nodesByKind(diagram, 'attribute')) {
      if (a.isKey && a.isMultivalued) {
        out.push(err('chen.attribute.key-not-multivalued', a.id, 'validation.chen.attribute.key-not-multivalued'))
      }
    }
    return out
  },
}

export const discriminantNotMultivaluedRule: ValidationRule = {
  id: 'chen.attribute.discriminant-not-multivalued',
  severity: 'error',
  category: 'attribute',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const a of nodesByKind(diagram, 'attribute')) {
      if (a.isDiscriminant && a.isMultivalued) {
        out.push(err('chen.attribute.discriminant-not-multivalued', a.id, 'validation.chen.attribute.discriminant-not-multivalued'))
      }
    }
    return out
  },
}

export const relationshipAttributeNotKeyRule: ValidationRule = {
  id: 'chen.attribute.relationship-not-key',
  severity: 'error',
  category: 'attribute',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const a of nodesByKind(diagram, 'attribute')) {
      if (!a.isKey) continue
      const parent = parentOf(diagram, a.id)
      if (parent && isRelationshipNode(parent)) {
        out.push(err('chen.attribute.relationship-not-key', a.id, 'validation.chen.attribute.relationship-not-key'))
      }
    }
    return out
  },
}

export const attributeNameUniqueRule: ValidationRule = {
  id: 'chen.attribute.name-unique',
  severity: 'error',
  category: 'attribute',
  check: (diagram) => {
    const out: ValidationError[] = []
    const groups = new Map<string, AttributeNode[]>()
    for (const a of nodesByKind(diagram, 'attribute')) {
      const parent = parentOf(diagram, a.id)
      if (!parent) continue
      const name = a.name.trim().toLowerCase()
      if (name.length === 0) continue
      const key = `${parent.id}::${name}`
      const list = groups.get(key) ?? []
      list.push(a)
      groups.set(key, list)
    }
    for (const list of groups.values()) {
      if (list.length < 2) continue
      for (const a of list) {
        out.push(err(
          'chen.attribute.name-unique', a.id,
          'validation.chen.attribute.name-unique',
          'error',
          { name: a.name },
        ))
      }
    }
    return out
  },
}

export const compositeNeedsSubRule: ValidationRule = {
  id: 'chen.attribute.composite-needs-sub',
  severity: 'error',
  category: 'attribute',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const a of nodesByKind(diagram, 'attribute')) {
      if (!a.isComposite) continue
      // Count inbound attribute-of edges from other attributes (sub-attributes).
      const hasSub = incidentEdges(diagram, a.id).some((edge) => {
        if (!isAttributeEdge(edge) || edge.targetId !== a.id) return false
        const src = diagram.nodesById[edge.sourceId]
        return !!src && isAttributeNode(src)
      })
      if (!hasSub) {
        out.push(err('chen.attribute.composite-needs-sub', a.id, 'validation.chen.attribute.composite-needs-sub'))
      }
    }
    return out
  },
}

const isSubAttribute = (diagram: Diagram, attrId: NodeId): boolean => {
  const p = parentOf(diagram, attrId)
  return !!p && isAttributeNode(p) && p.isComposite
}

export const subAttrNotKeyRule: ValidationRule = {
  id: 'chen.attribute.sub-not-key',
  severity: 'error',
  category: 'attribute',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const a of nodesByKind(diagram, 'attribute')) {
      if (a.isKey && isSubAttribute(diagram, a.id)) {
        out.push(err('chen.attribute.sub-not-key', a.id, 'validation.chen.attribute.sub-not-key'))
      }
    }
    return out
  },
}

export const subAttrNotDiscriminantRule: ValidationRule = {
  id: 'chen.attribute.sub-not-discriminant',
  severity: 'error',
  category: 'attribute',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const a of nodesByKind(diagram, 'attribute')) {
      if (a.isDiscriminant && isSubAttribute(diagram, a.id)) {
        out.push(err('chen.attribute.sub-not-discriminant', a.id, 'validation.chen.attribute.sub-not-discriminant'))
      }
    }
    return out
  },
}

export const subAttrNotCompositeRule: ValidationRule = {
  id: 'chen.attribute.sub-not-composite',
  severity: 'error',
  category: 'attribute',
  check: (diagram) => {
    const out: ValidationError[] = []
    for (const a of nodesByKind(diagram, 'attribute')) {
      if (a.isComposite && isSubAttribute(diagram, a.id)) {
        out.push(err('chen.attribute.sub-not-composite', a.id, 'validation.chen.attribute.sub-not-composite'))
      }
    }
    return out
  },
}

export const attributeRules: readonly ValidationRule[] = [
  attributeSingleParentRule,
  attributeNoDualParentRule,
  discriminantWeakOnlyRule,
  attributeNotKeyAndDerivedRule,
  keyNotMultivaluedRule,
  discriminantNotMultivaluedRule,
  relationshipAttributeNotKeyRule,
  attributeNameUniqueRule,
  compositeNeedsSubRule,
  subAttrNotKeyRule,
  subAttrNotDiscriminantRule,
  subAttrNotCompositeRule,
] as const
