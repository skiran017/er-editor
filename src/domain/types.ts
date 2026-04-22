// Branded ID types. Opaque at the call-site — constructable only via id.ts.
export type NodeId = string & { readonly __brand: 'NodeId' }
export type EdgeId = string & { readonly __brand: 'EdgeId' }

// Geometry primitives.
export interface Point { readonly x: number; readonly y: number }
export interface Size { readonly width: number; readonly height: number }
export interface BBox { readonly x: number; readonly y: number; readonly width: number; readonly height: number }

// Edge-participant sides.
export type Cardinality = '1' | 'N' | 'M'
export type Participation = 'total' | 'partial'

// ——— Nodes ———

interface NodeBase {
  readonly id: NodeId
  readonly position: Point
  readonly size: Size
}

export interface EntityNode extends NodeBase {
  readonly kind: 'entity'
  readonly name: string
  readonly isWeak: boolean
}

export interface RelationshipNode extends NodeBase {
  readonly kind: 'relationship'
  readonly name: string
  readonly isIdentifying: boolean
}

export interface AttributeNode extends NodeBase {
  readonly kind: 'attribute'
  readonly name: string
  readonly isKey: boolean
  readonly isDiscriminant: boolean
  readonly isMultivalued: boolean
  readonly isDerived: boolean
  readonly isComposite: boolean
}

export interface ISANode extends NodeBase {
  readonly kind: 'isa'
  readonly isTotal: boolean
}

export type ERNode = EntityNode | RelationshipNode | AttributeNode | ISANode
export type NodeKind = ERNode['kind']

// ——— Edges ———

interface EdgeBase {
  readonly id: EdgeId
  readonly sourceId: NodeId
  readonly targetId: NodeId
  readonly waypoints: readonly Point[]
}

export interface EntityRelationshipEdge extends EdgeBase {
  readonly kind: 'entity-relationship'
  readonly cardinality: Cardinality
  readonly participation: Participation
  readonly role?: string
}

export interface AttributeEdge extends EdgeBase {
  readonly kind: 'attribute-of'
}

export interface ISAEdge extends EdgeBase {
  readonly kind: 'isa-link'
  readonly role: 'parent' | 'child'
}

export type ERLink = EntityRelationshipEdge | AttributeEdge | ISAEdge
export type EdgeKind = ERLink['kind']

// ——— Diagram ———

export interface Diagram {
  readonly schemaVersion: 1
  readonly nodesById: Readonly<Record<NodeId, ERNode>>
  readonly edgesById: Readonly<Record<EdgeId, ERLink>>
  readonly nodeOrder: readonly NodeId[]
  readonly edgeOrder: readonly EdgeId[]
}

// Canonical empty-diagram factory.
export const emptyDiagram = (): Diagram => ({
  schemaVersion: 1,
  nodesById: {},
  edgesById: {},
  nodeOrder: [],
  edgeOrder: [],
})
