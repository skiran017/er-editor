import { useDiagramStore } from '@/state/diagramStore'
import { useSelectionStore } from '@/state/selectionStore'
import { EmptyPanel } from './EmptyPanel'
import { MultiSelectSummary } from './MultiSelectSummary'
import { EntityProperties } from './EntityProperties'
import { RelationshipProperties } from './RelationshipProperties'
import { AttributeProperties } from './AttributeProperties'
import { ISAProperties } from './ISAProperties'
import { EdgeProperties } from './EdgeProperties'

export const PropertyPanel = () => {
  const selectedNodeIds = useSelectionStore((s) => s.selectedNodeIds)
  const selectedEdgeIds = useSelectionStore((s) => s.selectedEdgeIds)
  const total = selectedNodeIds.size + selectedEdgeIds.size

  // Pick the lone selected id (or null). We avoid subscribing to the whole
  // diagram slice so unrelated mutations don't re-render the panel.
  const singleNodeId = total === 1 && selectedNodeIds.size === 1 ? [...selectedNodeIds][0] : null
  const singleEdgeId = total === 1 && selectedEdgeIds.size === 1 ? [...selectedEdgeIds][0] : null

  const node = useDiagramStore((s) => (singleNodeId ? s.diagram.nodesById[singleNodeId] : undefined))
  const edge = useDiagramStore((s) => (singleEdgeId ? s.diagram.edgesById[singleEdgeId] : undefined))

  if (total === 0) return <EmptyPanel />
  if (total > 1) return <MultiSelectSummary count={total} />

  if (singleNodeId) {
    if (!node) return <EmptyPanel />
    if (node.kind === 'entity') {
      return <div data-role="property-panel" data-node-kind="entity"><EntityProperties node={node} /></div>
    }
    if (node.kind === 'relationship') {
      return <div data-role="property-panel" data-node-kind="relationship"><RelationshipProperties node={node} /></div>
    }
    if (node.kind === 'attribute') {
      return <div data-role="property-panel" data-node-kind="attribute"><AttributeProperties node={node} /></div>
    }
    if (node.kind === 'isa') {
      return <div data-role="property-panel" data-node-kind="isa"><ISAProperties node={node} /></div>
    }
    // unreachable — all 4 node kinds covered above
    return <EmptyPanel />
  }

  if (!edge) return <EmptyPanel />
  return <div data-role="property-panel" data-edge-kind={edge.kind}><EdgeProperties edge={edge} /></div>
}
