import { asEdgeId, ID_LENGTH } from '@/domain/id'
import type {
  EntityRelationshipEdge, AttributeEdge, ISAEdge, EdgeId, NodeId,
} from '@/domain/types'

let counter = 0
const nextId = (): EdgeId => asEdgeId(`x${String(++counter).padStart(ID_LENGTH - 1, '0')}`)

export const resetEdgeIdCounter = (): void => { counter = 0 }

export const makeEREdge = (
  source: NodeId, target: NodeId, overrides: Partial<EntityRelationshipEdge> = {},
): EntityRelationshipEdge => ({
  id: nextId(),
  kind: 'entity-relationship',
  sourceId: source,
  targetId: target,
  cardinality: '1',
  participation: 'partial',
  waypoints: [],
  ...overrides,
})

export const makeAttrEdge = (
  source: NodeId, target: NodeId,
): AttributeEdge => ({
  id: nextId(),
  kind: 'attribute-of',
  sourceId: source,
  targetId: target,
  waypoints: [],
})

export const makeIsaEdge = (
  source: NodeId, target: NodeId, role: 'parent' | 'child',
): ISAEdge => ({
  id: nextId(),
  kind: 'isa-link',
  sourceId: source,
  targetId: target,
  role,
  waypoints: [],
})
