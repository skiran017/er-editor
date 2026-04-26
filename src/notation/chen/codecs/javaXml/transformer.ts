// src/notation/chen/codecs/javaXml/transformer.ts
import { newEdgeId, newNodeId } from '@/domain/id'
import {
  emptyDiagram,
  type AttributeNode,
  type Diagram,
  type EntityNode,
  type ERLink,
  type ERNode,
  type ISANode,
  type NodeId,
  type RelationshipNode,
} from '@/domain/types'
import type {
  JavaAttribute,
  JavaEntitySet,
  JavaGeneralization,
  JavaModel,
  JavaRelationshipSet,
} from './types'
import {
  isCompositeAttribute,
  isIdentifyingRelationship,
  isStrongEntity,
  isTotalGeneralization,
  isWeakEntity,
} from './types'

export { diagramToJava, type DiagramToJavaOptions } from './diagram-to-java'

const DEFAULT_ENTITY_SIZE = { width: 120, height: 60 }
const DEFAULT_ATTRIBUTE_SIZE = { width: 90, height: 50 }
const DEFAULT_RELATIONSHIP_SIZE = { width: 140, height: 70 }
const DEFAULT_ISA_SIZE = { width: 100, height: 60 }

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

const buildRelationshipNode = (model: JavaModel, r: JavaRelationshipSet): RelationshipNode => ({
  id: newNodeId(),
  kind: 'relationship',
  name: r.name,
  isIdentifying: isIdentifyingRelationship(r),
  position: positionOf(model, r.id),
  size: DEFAULT_RELATIONSHIP_SIZE,
})

const buildIsaNode = (model: JavaModel, g: JavaGeneralization): ISANode => ({
  id: newNodeId(),
  kind: 'isa',
  isTotal: isTotalGeneralization(g),
  position: positionOf(model, g.id),
  size: DEFAULT_ISA_SIZE,
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

// Sentinel entity used for relationship attributes — they never have isKey / isDiscriminant.
const NO_ENTITY: JavaEntitySet = {
  _kind: 'StrongEntitySet',
  id: -1,
  name: '',
  attributes: [],
  primaryKey: [],
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

const cardinalityToParticipation = (totalParticipation: boolean): 'total' | 'partial' =>
  totalParticipation ? 'total' : 'partial'

// Internal state threaded through the transformer so relationship branches can
// resolve which entity node corresponds to a given Java entity id.
interface TransformState {
  diagram: Diagram
  /** Java integer id → our NodeId (entities only). */
  entityNodeIdByJavaId: Map<number, NodeId>
}

export const javaToDiagram = (model: JavaModel): Diagram => {
  const state: TransformState = {
    diagram: emptyDiagram(),
    entityNodeIdByJavaId: new Map(),
  }

  // --- Entities ---
  for (const e of model.schema.entities) {
    const node = buildEntityNode(model, e)
    state.entityNodeIdByJavaId.set(e.id, node.id)
    state.diagram = addNode(state.diagram, node)
    for (const a of e.attributes) {
      state.diagram = addAttributeWithEdge(state.diagram, model, node.id, a, e)
    }
  }

  // --- Relationships ---
  for (const r of model.schema.relationships) {
    const relNode = buildRelationshipNode(model, r)
    state.diagram = addNode(state.diagram, relNode)

    // Relationship attributes attach to the relationship node.
    for (const a of r.attributes) {
      state.diagram = addAttributeWithEdge(state.diagram, model, relNode.id, a, NO_ENTITY)
    }

    // One entity-relationship edge per branch.
    for (const branch of r.branches) {
      const entityNodeId = state.entityNodeIdByJavaId.get(branch.entityRef.refid)
      if (entityNodeId === undefined) continue
      const edge: ERLink = {
        id: newEdgeId(),
        kind: 'entity-relationship',
        sourceId: entityNodeId,
        targetId: relNode.id,
        cardinality: branch.cardinality,
        participation: cardinalityToParticipation(branch.totalParticipation),
        waypoints: [],
      }
      state.diagram = addEdge(state.diagram, edge)
    }
  }

  // --- Generalizations ---
  for (const g of model.schema.generalizations) {
    const isaNode = buildIsaNode(model, g)
    state.diagram = addNode(state.diagram, isaNode)

    // Parent edge.
    const parentEntityId = state.entityNodeIdByJavaId.get(g.parent.refid)
    if (parentEntityId !== undefined) {
      const parentEdge: ERLink = {
        id: newEdgeId(),
        kind: 'isa-link',
        sourceId: isaNode.id,
        targetId: parentEntityId,
        role: 'parent',
        waypoints: [],
      }
      state.diagram = addEdge(state.diagram, parentEdge)
    }

    // Child edges.
    for (const child of g.children) {
      const childEntityId = state.entityNodeIdByJavaId.get(child.refid)
      if (childEntityId === undefined) continue
      const childEdge: ERLink = {
        id: newEdgeId(),
        kind: 'isa-link',
        sourceId: isaNode.id,
        targetId: childEntityId,
        role: 'child',
        waypoints: [],
      }
      state.diagram = addEdge(state.diagram, childEdge)
    }
  }

  return state.diagram
}
