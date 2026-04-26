// src/notation/chen/codecs/javaXml/diagram-to-java.ts
// Reverse transformer: Diagram → JavaModel.
// ID re-assignment mirrors Java's reassignID walk order:
//   entities (+ their attributes recursively) → relationships (+ attrs + branches) → ISAs.
import type { Cardinality, Diagram, NodeId } from '@/domain/types'
import type {
  JavaAttribute,
  JavaEntitySet,
  JavaGeneralization,
  JavaModel,
  JavaPosition,
  JavaRelationshipSet,
  JavaRelationshipSetBranch,
  JavaRelationshipSetKind,
  JavaSchema,
} from './types'

export interface DiagramToJavaOptions {
  readonly databaseName?: string
}

const toJavaCardinality = (c: Cardinality): '1' | 'N' => (c === '1' ? '1' : 'N')

export const classifyRelationship = (
  branchCardinalities: readonly ('1' | 'N')[],
  identifying: boolean,
): JavaRelationshipSetKind => {
  if (branchCardinalities.length === 2) {
    const [a, b] = branchCardinalities
    if (a === '1' && b === '1') return identifying ? 'IdentifyingRelationshipSetOneToOne' : 'RelationshipSetOneToOne'
    if (a === '1' && b === 'N') return identifying ? 'IdentifyingRelationshipSetOneToN' : 'RelationshipSetOneToN'
    if (a === 'N' && b === '1') return identifying ? 'IdentifyingRelationshipSetNToOne' : 'RelationshipSetNToOne'
    return 'RelationshipSetNToN'
  }
  // 3+ branches: only RelationshipSetNToN exists in Java.
  return 'RelationshipSetNToN'
}

// Build the attribute-of adjacency map: parentNodeId → [attributeNodeId, ...]
const buildAttrChildrenMap = (d: Diagram): Map<NodeId, NodeId[]> => {
  const map = new Map<NodeId, NodeId[]>()
  for (const edgeId of d.edgeOrder) {
    const edge = d.edgesById[edgeId]!
    if (edge.kind !== 'attribute-of') continue
    const list = map.get(edge.targetId) ?? []
    list.push(edge.sourceId)
    map.set(edge.targetId, list)
  }
  return map
}

// Collect top-level attribute nodeIds whose attribute-of edge points to parentNodeId.
const topLevelAttrsFor = (d: Diagram, parentNodeId: NodeId): NodeId[] => {
  const result: NodeId[] = []
  for (const edgeId of d.edgeOrder) {
    const edge = d.edgesById[edgeId]!
    if (edge.kind !== 'attribute-of') continue
    if (edge.targetId !== parentNodeId) continue
    result.push(edge.sourceId)
  }
  return result
}

// Recursively convert an attribute node (and composite children) to JavaAttribute.
const buildJavaAttribute = (
  d: Diagram,
  attrChildrenMap: Map<NodeId, NodeId[]>,
  nodeId: NodeId,
  javaIdByNodeId: Map<NodeId, number>,
  nextId: () => number,
): JavaAttribute => {
  const node = d.nodesById[nodeId]!
  if (node.kind !== 'attribute') throw new Error(`Expected attribute node, got ${node.kind}`)
  const id = nextId()
  javaIdByNodeId.set(nodeId, id)

  const children = attrChildrenMap.get(nodeId) ?? []
  if (node.isComposite && children.length > 0) {
    return {
      _kind: 'CompositeAttribute',
      id,
      name: node.name,
      multiValued: node.isMultivalued,
      derived: node.isDerived,
      children: children.map((cId) =>
        buildJavaAttribute(d, attrChildrenMap, cId, javaIdByNodeId, nextId),
      ),
    }
  }
  return { _kind: 'SimpleAttribute', id, name: node.name, multiValued: node.isMultivalued, derived: node.isDerived }
}

// Build a lookup: entityNodeId → { keyAttrNodeIds, discriminantAttrNodeIds }
// from the verbatim import metadata (preserves original PrimaryKey/Discriminant order).
type KeyOrderMap = ReadonlyMap<NodeId, { keyAttrNodeIds: readonly NodeId[]; discriminantAttrNodeIds: readonly NodeId[] }>

const buildKeyOrderMap = (d: Diagram): KeyOrderMap => {
  const map = new Map<NodeId, { keyAttrNodeIds: readonly NodeId[]; discriminantAttrNodeIds: readonly NodeId[] }>()
  if (d._javaXmlKeyOrders) {
    for (const entry of d._javaXmlKeyOrders) {
      map.set(entry.entityNodeId, {
        keyAttrNodeIds: entry.keyAttrNodeIds,
        discriminantAttrNodeIds: entry.discriminantAttrNodeIds,
      })
    }
  }
  return map
}

const buildEntityAttrs = (
  d: Diagram,
  attrChildrenMap: Map<NodeId, NodeId[]>,
  entityNodeId: NodeId,
  javaIdByNodeId: Map<NodeId, number>,
  keyOrderMap: KeyOrderMap,
  nextId: () => number,
): { attributes: JavaAttribute[]; keyIds: number[]; discriminantIds: number[] } => {
  const attributes: JavaAttribute[] = []
  for (const attrNodeId of topLevelAttrsFor(d, entityNodeId)) {
    const attrNode = d.nodesById[attrNodeId]!
    if (attrNode.kind !== 'attribute') continue
    attributes.push(buildJavaAttribute(d, attrChildrenMap, attrNodeId, javaIdByNodeId, nextId))
  }

  const keyOrder = keyOrderMap.get(entityNodeId)
  let keyIds: number[]
  let discriminantIds: number[]

  if (keyOrder !== undefined) {
    // Use the verbatim import ordering for PrimaryKey / Discriminant members.
    keyIds = keyOrder.keyAttrNodeIds
      .map((nid) => javaIdByNodeId.get(nid))
      .filter((id): id is number => id !== undefined)
    discriminantIds = keyOrder.discriminantAttrNodeIds
      .map((nid) => javaIdByNodeId.get(nid))
      .filter((id): id is number => id !== undefined)
  } else {
    // Fresh diagram: collect keys in attribute traversal order.
    keyIds = []
    discriminantIds = []
    for (const attrNodeId of topLevelAttrsFor(d, entityNodeId)) {
      const attrNode = d.nodesById[attrNodeId]!
      if (attrNode.kind !== 'attribute') continue
      const jid = javaIdByNodeId.get(attrNodeId)
      if (jid === undefined) continue
      if (attrNode.isKey) keyIds.push(jid)
      if (attrNode.isDiscriminant) discriminantIds.push(jid)
    }
  }

  return { attributes, keyIds, discriminantIds }
}

const buildEntities = (
  d: Diagram,
  attrChildrenMap: Map<NodeId, NodeId[]>,
  javaIdByNodeId: Map<NodeId, number>,
  keyOrderMap: KeyOrderMap,
  nextId: () => number,
): JavaEntitySet[] => {
  const entities: JavaEntitySet[] = []
  for (const nodeId of d.nodeOrder) {
    const node = d.nodesById[nodeId]!
    if (node.kind !== 'entity') continue
    const id = nextId()
    javaIdByNodeId.set(nodeId, id)
    const { attributes, keyIds, discriminantIds } = buildEntityAttrs(
      d, attrChildrenMap, nodeId, javaIdByNodeId, keyOrderMap, nextId,
    )
    if (node.isWeak) {
      entities.push({ _kind: 'WeakEntitySet', id, name: node.name, attributes, discriminant: discriminantIds })
    } else {
      entities.push({ _kind: 'StrongEntitySet', id, name: node.name, attributes, primaryKey: keyIds })
    }
  }
  return entities
}

const buildRelationshipBranches = (
  d: Diagram,
  relNodeId: NodeId,
  javaIdByNodeId: Map<NodeId, number>,
  nextId: () => number,
): JavaRelationshipSetBranch[] => {
  const branches: JavaRelationshipSetBranch[] = []
  for (const edgeId of d.edgeOrder) {
    const edge = d.edgesById[edgeId]!
    if (edge.kind !== 'entity-relationship') continue
    if (edge.targetId !== relNodeId) continue
    const entityJavaId = javaIdByNodeId.get(edge.sourceId)
    if (entityJavaId === undefined) continue
    const entityNode = d.nodesById[edge.sourceId]!
    const entityKind = entityNode.kind === 'entity' && entityNode.isWeak ? 'WeakEntitySet' : 'StrongEntitySet'
    branches.push({
      _kind: 'RelationshipSetBranch',
      id: nextId(),
      cardinality: toJavaCardinality(edge.cardinality),
      totalParticipation: edge.participation === 'total',
      role: '',
      entityRef: { _kind: entityKind, refid: entityJavaId },
    })
  }
  return branches
}

const buildRelationships = (
  d: Diagram,
  attrChildrenMap: Map<NodeId, NodeId[]>,
  javaIdByNodeId: Map<NodeId, number>,
  nextId: () => number,
): JavaRelationshipSet[] => {
  const relationships: JavaRelationshipSet[] = []
  for (const nodeId of d.nodeOrder) {
    const node = d.nodesById[nodeId]!
    if (node.kind !== 'relationship') continue
    const id = nextId()
    javaIdByNodeId.set(nodeId, id)
    const attributes: JavaAttribute[] = []
    for (const attrNodeId of topLevelAttrsFor(d, nodeId)) {
      const attrNode = d.nodesById[attrNodeId]!
      if (attrNode.kind !== 'attribute') continue
      attributes.push(buildJavaAttribute(d, attrChildrenMap, attrNodeId, javaIdByNodeId, nextId))
    }
    const branches = buildRelationshipBranches(d, nodeId, javaIdByNodeId, nextId)
    const kind = classifyRelationship(branches.map((b) => b.cardinality), node.isIdentifying)
    relationships.push({ _kind: kind, id, name: node.name, attributes, branches })
  }
  return relationships
}

const buildGeneralizations = (
  d: Diagram,
  javaIdByNodeId: Map<NodeId, number>,
  nextId: () => number,
): JavaGeneralization[] => {
  const generalizations: JavaGeneralization[] = []
  for (const nodeId of d.nodeOrder) {
    const node = d.nodesById[nodeId]!
    if (node.kind !== 'isa') continue
    const id = nextId()
    javaIdByNodeId.set(nodeId, id)
    let parentRef: JavaGeneralization['parent'] | undefined
    const childRefs: JavaGeneralization['children'][number][] = []
    for (const edgeId of d.edgeOrder) {
      const edge = d.edgesById[edgeId]!
      if (edge.kind !== 'isa-link' || edge.sourceId !== nodeId) continue
      const entityJavaId = javaIdByNodeId.get(edge.targetId)
      if (entityJavaId === undefined) continue
      const entityNode = d.nodesById[edge.targetId]!
      const kind = entityNode.kind === 'entity' && entityNode.isWeak ? 'WeakEntitySet' : 'StrongEntitySet'
      if (edge.role === 'parent') parentRef = { _kind: kind, refid: entityJavaId }
      else childRefs.push({ _kind: kind, refid: entityJavaId })
    }
    if (parentRef === undefined) continue
    if (node.isTotal) {
      generalizations.push({ _kind: 'TotalGeneralization', id, total: true, parent: parentRef, children: childRefs })
    } else {
      generalizations.push({ _kind: 'Generalization', id, total: false, parent: parentRef, children: childRefs })
    }
  }
  return generalizations
}

const buildPositions = (d: Diagram, javaIdByNodeId: Map<NodeId, number>): Map<number, JavaPosition> => {
  // If the diagram was imported from Java XML, _javaXmlPositions carries the
  // original ERDatabaseDiagram order. Use it verbatim so the re-serialized
  // positions section matches the input byte-for-byte.
  if (d._javaXmlPositions !== undefined && d._javaXmlPositions.length > 0) {
    const positions = new Map<number, JavaPosition>()
    for (const [id, p] of d._javaXmlPositions) {
      positions.set(id, { x: p.x, y: p.y })
    }
    return positions
  }
  // Fresh diagram: build from nodeOrder.
  const positions = new Map<number, JavaPosition>()
  for (const nodeId of d.nodeOrder) {
    const node = d.nodesById[nodeId]!
    const javaId = javaIdByNodeId.get(nodeId)
    if (javaId === undefined) continue
    positions.set(javaId, { x: node.position.x, y: node.position.y })
  }
  return positions
}

export const diagramToJava = (d: Diagram, opts: DiagramToJavaOptions = {}): JavaModel => {
  const databaseName = d.databaseName ?? opts.databaseName ?? 'Unnamed_DB_Schema_1'
  let counter = 0
  const nextId = (): number => ++counter
  const attrChildrenMap = buildAttrChildrenMap(d)
  const javaIdByNodeId = new Map<NodeId, number>()
  const keyOrderMap = buildKeyOrderMap(d)
  const entities = buildEntities(d, attrChildrenMap, javaIdByNodeId, keyOrderMap, nextId)
  const relationships = buildRelationships(d, attrChildrenMap, javaIdByNodeId, nextId)
  const generalizations = buildGeneralizations(d, javaIdByNodeId, nextId)
  const positions = buildPositions(d, javaIdByNodeId)
  // Prefer the verbatim lastId stored from import (handles stale lastId=0 quirk
  // in some SUPSI saves) over the re-assigned counter value.
  const lastId = d.databaseLastId !== undefined ? d.databaseLastId : counter
  const schema: JavaSchema = { name: databaseName, lastId, entities, relationships, generalizations }
  return { schema, diagram: { positions } }
}
