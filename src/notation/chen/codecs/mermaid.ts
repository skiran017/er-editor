// src/notation/chen/codecs/mermaid.ts
// Export-only codec: transforms a Diagram into Mermaid erDiagram syntax.
// Mermaid spec: https://mermaid.js.org/syntax/entityRelationshipDiagram.html
import type {
  Diagram,
  EntityNode,
  AttributeNode,
  RelationshipNode,
  ISANode,
  Cardinality,
  Participation,
  NodeId,
} from '@/domain/types'
import type { Codec } from './types'

// Mermaid crow's-foot notation (spec: https://mermaid.js.org/syntax/entityRelationshipDiagram.html):
// Each side of a relationship is a 2-character symbol.
// RIGHT side (entity on right, reading left-to-right): <participation><cardinality>
//   participation: | = mandatory,  o = optional
//   cardinality:   | = one,        } = many
// LEFT side (entity on left, reading left-to-right): <cardinality><participation>
//   cardinality:   | = one,        { = many
//   participation: | = mandatory,  o = optional
// Examples from spec: "CUSTOMER ||--o{ ORDER" → left=||  right=o{

const crowsFootRight = (cardinality: Cardinality, participation: Participation): string => {
  const isMany = cardinality !== '1' // N and M both → many
  const participationChar = participation === 'total' ? '|' : 'o'
  const cardinalityChar = isMany ? '}' : '|'
  return `${participationChar}${cardinalityChar}`
}

const crowsFootLeft = (cardinality: Cardinality, participation: Participation): string => {
  const isMany = cardinality !== '1'
  const cardinalityChar = isMany ? '{' : '|'
  const participationChar = participation === 'total' ? '|' : 'o'
  return `${cardinalityChar}${participationChar}`
}

const INDENT = '    '

const serializeDiagram = (d: Diagram): string => {
  const lines: string[] = ['erDiagram']

  // Index: attribute-of edges by target (entity or relationship node id)
  const attrEdgesByTarget = new Map<NodeId, NodeId[]>()
  // Index: entity-relationship edges by relationship node id
  const erEdgesByRelId = new Map<NodeId, Array<{ entityId: NodeId; cardinality: Cardinality; participation: Participation }>>()
  // Index: isa-link edges by isa node id
  const isaEdgesByIsaId = new Map<NodeId, { parentId?: NodeId; childIds: NodeId[] }>()

  // Build indexes from edgeOrder to preserve deterministic ordering
  for (const edgeId of d.edgeOrder) {
    const edge = d.edgesById[edgeId]
    if (!edge) continue

    if (edge.kind === 'attribute-of') {
      const list = attrEdgesByTarget.get(edge.targetId) ?? []
      list.push(edge.sourceId)
      attrEdgesByTarget.set(edge.targetId, list)
    } else if (edge.kind === 'entity-relationship') {
      const list = erEdgesByRelId.get(edge.targetId) ?? []
      list.push({ entityId: edge.sourceId, cardinality: edge.cardinality, participation: edge.participation })
      erEdgesByRelId.set(edge.targetId, list)
    } else if (edge.kind === 'isa-link') {
      const entry = isaEdgesByIsaId.get(edge.sourceId) ?? { parentId: undefined, childIds: [] }
      if (edge.role === 'parent') entry.parentId = edge.targetId
      else entry.childIds.push(edge.targetId)
      isaEdgesByIsaId.set(edge.sourceId, entry)
    }
  }

  // Helper: collect leaf attribute nodes for a given parent, flattening composites.
  // Returns [attributeNode, compositeParentName | undefined][]
  const collectLeafAttrs = (
    parentId: NodeId,
    compositeParentName?: string,
  ): Array<{ node: AttributeNode; compositeParent?: string }> => {
    const result: Array<{ node: AttributeNode; compositeParent?: string }> = []
    const attrIds = attrEdgesByTarget.get(parentId) ?? []
    for (const attrId of attrIds) {
      const node = d.nodesById[attrId]
      if (!node || node.kind !== 'attribute') continue
      if (node.isComposite) {
        // Flatten: recurse to children, tagging them with this parent's name
        result.push(...collectLeafAttrs(attrId, node.name))
      } else {
        result.push({ node, compositeParent: compositeParentName })
      }
    }
    return result
  }

  // --- Entities ---
  for (const nodeId of d.nodeOrder) {
    const node = d.nodesById[nodeId]
    if (!node || node.kind !== 'entity') continue
    const entity = node as EntityNode

    const leafAttrs = collectLeafAttrs(entity.id)
    lines.push(`${INDENT}${entity.name} {`)
    for (const { node: attr, compositeParent } of leafAttrs) {
      const comment = compositeParent ? ` // composite of ${compositeParent}` : ''
      lines.push(`${INDENT}${INDENT}string ${attr.name}${comment}`)
    }
    lines.push(`${INDENT}}`)
  }

  // --- Relationships ---
  for (const nodeId of d.nodeOrder) {
    const node = d.nodesById[nodeId]
    if (!node || node.kind !== 'relationship') continue
    const rel = node as RelationshipNode

    const branches = erEdgesByRelId.get(rel.id) ?? []
    const connector = rel.isIdentifying ? '--' : '..'

    if (branches.length === 0) {
      // No branches — nothing to emit
      continue
    }

    if (branches.length > 2) {
      // N-ary relationship: skip with a comment
      lines.push(`${INDENT}%% N-ary relationship (${branches.length}-way): ${rel.name} — skipped`)
      continue
    }

    // Binary relationship (exactly 2 branches)
    const [left, right] = branches
    const leftEntity = d.nodesById[left.entityId] as EntityNode | undefined
    const rightEntity = d.nodesById[right.entityId] as EntityNode | undefined
    if (!leftEntity || !rightEntity) continue

    const rightSymbol = crowsFootRight(right.cardinality, right.participation)
    const leftSymbol = crowsFootLeft(left.cardinality, left.participation)

    lines.push(
      `${INDENT}${leftEntity.name} ${leftSymbol}${connector}${rightSymbol} ${rightEntity.name} : ${rel.name}`,
    )
  }

  // --- Generalizations (ISA) ---
  for (const nodeId of d.nodeOrder) {
    const node = d.nodesById[nodeId]
    if (!node || node.kind !== 'isa') continue
    const isa = node as ISANode

    const isaEdges = isaEdgesByIsaId.get(isa.id)
    if (!isaEdges) continue

    const parentNode = isaEdges.parentId ? d.nodesById[isaEdges.parentId] : undefined
    const parentName = parentNode?.kind === 'entity' ? parentNode.name : '?'
    const childNames = isaEdges.childIds
      .map((id) => d.nodesById[id])
      .filter((n): n is EntityNode => n?.kind === 'entity')
      .map((n) => n.name)

    const totalFlag = isa.isTotal ? 'total' : 'partial'
    lines.push(
      `${INDENT}%% Generalization (${totalFlag}): ${parentName} -> [${childNames.join(', ')}]`,
    )
  }

  return lines.join('\n') + '\n'
}

export const mermaidCodec: Codec = {
  id: 'mermaid',
  displayName: 'Mermaid',
  mode: 'export',
  serialize: serializeDiagram,
}
