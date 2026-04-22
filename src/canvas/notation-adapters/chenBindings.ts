import type { ComponentType } from 'react'
import type { NodeProps, EdgeProps } from '@xyflow/react'
import type { NodeKind, EdgeKind } from '@/domain/types'
import { EntityNode } from './EntityNode'
import { RelationshipNode } from './RelationshipNode'
import { AttributeNode } from './AttributeNode'
import { ISANode } from './ISANode'
import { EntityRelationshipEdge } from './EntityRelationshipEdge'
import { AttributeEdge } from './AttributeEdge'
import { ISAEdge } from './ISAEdge'

// React-Flow's `ComponentType<NodeProps>` uses the unparameterized `NodeProps`
// (data: Record<string, unknown>), which is contravariantly incompatible with
// our containers that narrow to `NodeProps<Node<NotationNodeData, ...>>`. The
// runtime shape is correct — React-Flow supplies data matching our `NotationNodeData`
// contract — so we coerce through `unknown` to align with the plugin signature.
export const chenNodeTypes: Record<NodeKind, ComponentType<NodeProps>> = {
  entity: EntityNode as unknown as ComponentType<NodeProps>,
  relationship: RelationshipNode as unknown as ComponentType<NodeProps>,
  attribute: AttributeNode as unknown as ComponentType<NodeProps>,
  isa: ISANode as unknown as ComponentType<NodeProps>,
}

export const chenEdgeTypes: Record<EdgeKind, ComponentType<EdgeProps>> = {
  'entity-relationship': EntityRelationshipEdge as unknown as ComponentType<EdgeProps>,
  'attribute-of': AttributeEdge as unknown as ComponentType<EdgeProps>,
  'isa-link': ISAEdge as unknown as ComponentType<EdgeProps>,
}
