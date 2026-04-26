// src/notation/chen/codecs/javaXml/transformer.ts
import { newEdgeId, newNodeId } from '@/domain/id'
import {
  emptyDiagram,
  type AttributeNode,
  type Diagram,
  type EntityNode,
  type ERLink,
  type ERNode,
  type NodeId,
} from '@/domain/types'
import type {
  JavaAttribute,
  JavaEntitySet,
  JavaModel,
} from './types'
import { isCompositeAttribute, isStrongEntity, isWeakEntity } from './types'

const DEFAULT_ENTITY_SIZE = { width: 120, height: 60 }
const DEFAULT_ATTRIBUTE_SIZE = { width: 90, height: 50 }

const positionOf = (model: JavaModel, id: number): { x: number; y: number } =>
  model.diagram.positions.get(id) ?? { x: 0, y: 0 }

const buildEntityNode = (model: JavaModel, e: JavaEntitySet): EntityNode => ({
  id: newNodeId(),
  kind: 'entity',
  name: e.name,
  isWeak: isWeakEntity(e),
  position: positionOf(model, e.id),
  size: DEFAULT_ENTITY_SIZE,
})

const buildAttributeNode = (
  model: JavaModel,
  a: JavaAttribute,
  isKey: boolean,
  isDiscriminant: boolean,
): AttributeNode => ({
  id: newNodeId(),
  kind: 'attribute',
  name: a.name,
  isKey,
  isDiscriminant,
  isMultivalued: a.multiValued,
  isDerived: a.derived,
  isComposite: isCompositeAttribute(a),
  position: positionOf(model, a.id),
  size: DEFAULT_ATTRIBUTE_SIZE,
})

const addNode = (d: Diagram, n: ERNode): Diagram => ({
  ...d,
  nodesById: { ...d.nodesById, [n.id]: n },
  nodeOrder: [...d.nodeOrder, n.id],
})

const addEdge = (d: Diagram, e: ERLink): Diagram => ({
  ...d,
  edgesById: { ...d.edgesById, [e.id]: e },
  edgeOrder: [...d.edgeOrder, e.id],
})

const isAttributeKeyMember = (e: JavaEntitySet, a: JavaAttribute): boolean => {
  if (isStrongEntity(e)) return e.primaryKey.includes(a.id)
  return false
}

const isAttributeDiscriminantMember = (e: JavaEntitySet, a: JavaAttribute): boolean => {
  if (isWeakEntity(e)) return e.discriminant.includes(a.id)
  return false
}

const addAttributeWithEdge = (
  d: Diagram,
  model: JavaModel,
  parentId: NodeId,
  a: JavaAttribute,
  e: JavaEntitySet,
): Diagram => {
  const node = buildAttributeNode(
    model, a,
    isAttributeKeyMember(e, a),
    isAttributeDiscriminantMember(e, a),
  )
  const edge: ERLink = {
    id: newEdgeId(),
    kind: 'attribute-of',
    sourceId: node.id,
    targetId: parentId,
    waypoints: [],
  }
  let next = addNode(d, node)
  next = addEdge(next, edge)
  // Composite children fold under the composite attribute itself, not under the entity.
  if (isCompositeAttribute(a)) {
    for (const child of a.children) {
      next = addAttributeWithEdge(next, model, node.id, child, e)
    }
  }
  return next
}

export const javaToDiagram = (model: JavaModel): Diagram => {
  let d = emptyDiagram()
  for (const e of model.schema.entities) {
    const node = buildEntityNode(model, e)
    d = addNode(d, node)
    for (const a of e.attributes) {
      d = addAttributeWithEdge(d, model, node.id, a, e)
    }
  }
  // Relationships + generalizations land in Task 9.
  return d
}
