import { useDiagramStore } from '@/state/diagramStore'
import { useSelectionStore } from '@/state/selectionStore'
import { EmptyPanel } from './EmptyPanel'
import { MultiSelectSummary } from './MultiSelectSummary'
import { EntityProperties } from './EntityProperties'
import { RelationshipProperties } from './RelationshipProperties'
import { AttributeProperties } from './AttributeProperties'
import { ISAProperties } from './ISAProperties'

// Edge editors land in Task 12; keep the placeholder until then.
const Placeholder = ({ label }: { label: string }) => (
  <div className="p-3 text-xs text-slate-500" data-role="placeholder">{label}</div>
)

export const PropertyPanel = () => {
  const selectedNodeIds = useSelectionStore((s) => s.selectedNodeIds)
  const selectedEdgeIds = useSelectionStore((s) => s.selectedEdgeIds)
  const diagram = useDiagramStore((s) => s.diagram)

  const total = selectedNodeIds.size + selectedEdgeIds.size
  if (total === 0) return <EmptyPanel />
  if (total > 1) return <MultiSelectSummary count={total} />

  if (selectedNodeIds.size === 1) {
    const id = [...selectedNodeIds][0]
    const node = diagram.nodesById[id]
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

  const id = [...selectedEdgeIds][0]
  const edge = diagram.edgesById[id]
  if (!edge) return <EmptyPanel />
  return <div data-role="property-panel" data-edge-kind={edge.kind}><Placeholder label={`${edge.kind} editor (Task 12)`} /></div>
}
