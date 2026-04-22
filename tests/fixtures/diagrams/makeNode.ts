import { asNodeId, ID_LENGTH } from '@/domain/id'
import type {
  EntityNode, RelationshipNode, AttributeNode, ISANode, NodeId,
} from '@/domain/types'

let counter = 0
const nextId = (prefix: string): NodeId =>
  asNodeId(`${prefix}${String(++counter).padStart(ID_LENGTH - prefix.length, '0')}`.slice(0, ID_LENGTH))

export const resetIdCounter = (): void => { counter = 0 }

export const makeEntity = (overrides: Partial<EntityNode> = {}): EntityNode => ({
  id: nextId('e'),
  kind: 'entity',
  name: 'Entity',
  isWeak: false,
  position: { x: 0, y: 0 },
  size: { width: 120, height: 60 },
  ...overrides,
})

export const makeRelationship = (overrides: Partial<RelationshipNode> = {}): RelationshipNode => ({
  id: nextId('r'),
  kind: 'relationship',
  name: 'Rel',
  isIdentifying: false,
  position: { x: 0, y: 0 },
  size: { width: 140, height: 70 },
  ...overrides,
})

export const makeAttribute = (overrides: Partial<AttributeNode> = {}): AttributeNode => ({
  id: nextId('a'),
  kind: 'attribute',
  name: 'attr',
  isKey: false,
  isDiscriminant: false,
  isMultivalued: false,
  isDerived: false,
  isComposite: false,
  position: { x: 0, y: 0 },
  size: { width: 90, height: 50 },
  ...overrides,
})

export const makeIsa = (overrides: Partial<ISANode> = {}): ISANode => ({
  id: nextId('i'),
  kind: 'isa',
  isTotal: false,
  position: { x: 0, y: 0 },
  size: { width: 100, height: 60 },
  ...overrides,
})
