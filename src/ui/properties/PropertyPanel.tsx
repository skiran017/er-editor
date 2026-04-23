import type { ReactNode } from 'react'
import { useDiagramStore } from '@/state/diagramStore'
import { useSelectionStore } from '@/state/selectionStore'
import { EmptyPanel } from './EmptyPanel'
import { MultiSelectSummary } from './MultiSelectSummary'
import { EntityProperties } from './EntityProperties'
import { RelationshipProperties } from './RelationshipProperties'
import { AttributeProperties } from './AttributeProperties'
import { ISAProperties } from './ISAProperties'
import { EdgeProperties } from './EdgeProperties'
import { PanelHeader, type PanelKind } from './PanelHeader'
import { ConnectionsList } from './ConnectionsList'
import { ValidationList } from './ValidationList'

interface FrameProps {
  readonly titleKey: string
  readonly kind: PanelKind
  readonly children: ReactNode
  readonly testAttrs?: Readonly<Record<string, string>>
}

const Frame = ({ titleKey, kind, children, testAttrs }: FrameProps) => (
  <div className="flex h-full flex-col" data-role="property-panel" {...testAttrs}>
    <PanelHeader titleKey={titleKey} kind={kind} />
    <div className="flex-1 overflow-y-auto">{children}</div>
  </div>
)

export const PropertyPanel = () => {
  const selectedNodeIds = useSelectionStore((s) => s.selectedNodeIds)
  const selectedEdgeIds = useSelectionStore((s) => s.selectedEdgeIds)
  const total = selectedNodeIds.size + selectedEdgeIds.size

  const singleNodeId = total === 1 && selectedNodeIds.size === 1 ? [...selectedNodeIds][0] : null
  const singleEdgeId = total === 1 && selectedEdgeIds.size === 1 ? [...selectedEdgeIds][0] : null

  const node = useDiagramStore((s) => (singleNodeId ? s.diagram.nodesById[singleNodeId] : undefined))
  const edge = useDiagramStore((s) => (singleEdgeId ? s.diagram.edgesById[singleEdgeId] : undefined))

  if (total === 0) return <EmptyPanel />
  if (total > 1) return <MultiSelectSummary count={total} />

  if (singleNodeId) {
    if (!node) return <EmptyPanel />
    const titleKey = `kind.${node.kind}`
    // Entity / Relationship: attributes and (for relationships) per-leg cards
    // replace the old generic ConnectionsList — you edit everything inline.
    if (node.kind === 'entity') {
      return (
        <Frame titleKey={titleKey} kind="entity" testAttrs={{ 'data-node-kind': 'entity' }}>
          <EntityProperties node={node} />
          <ValidationList targetId={node.id} />
        </Frame>
      )
    }
    if (node.kind === 'relationship') {
      return (
        <Frame titleKey={titleKey} kind="relationship" testAttrs={{ 'data-node-kind': 'relationship' }}>
          <RelationshipProperties node={node} />
          <ValidationList targetId={node.id} />
        </Frame>
      )
    }
    // Attribute / ISA still use ConnectionsList for navigation to parent(s) —
    // they don't own inline children, so there's nothing to inline.
    if (node.kind === 'attribute') {
      return (
        <Frame titleKey={titleKey} kind="attribute" testAttrs={{ 'data-node-kind': 'attribute' }}>
          <AttributeProperties node={node} />
          <ValidationList targetId={node.id} />
          <ConnectionsList nodeId={node.id} />
        </Frame>
      )
    }
    if (node.kind === 'isa') {
      return (
        <Frame titleKey={titleKey} kind="isa" testAttrs={{ 'data-node-kind': 'isa' }}>
          <ISAProperties node={node} />
          <ValidationList targetId={node.id} />
          <ConnectionsList nodeId={node.id} />
        </Frame>
      )
    }
    return <EmptyPanel />
  }

  if (!edge) return <EmptyPanel />
  return (
    <Frame titleKey={`kind.${edge.kind}`} kind={edge.kind} testAttrs={{ 'data-edge-kind': edge.kind }}>
      <EdgeProperties edge={edge} />
      <ValidationList targetId={edge.id} />
    </Frame>
  )
}
