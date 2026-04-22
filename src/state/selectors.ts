import type { DiagramStoreState } from './diagramStore'
import type { ValidationStoreState } from './validationStore'
import { useDiagramStore } from './diagramStore'
import { useSelectionStore } from './selectionStore'
import { incidentEdges } from '@/domain/graph'
import type { ERNode, ERLink, NodeId, ValidationError } from '@/domain/types'

export const selectNodeById =
  <T extends ERNode = ERNode>(id: NodeId) =>
  (state: DiagramStoreState): T | undefined =>
    state.diagram.nodesById[id] as T | undefined

export const selectIncidentEdges =
  (id: NodeId) =>
  (state: DiagramStoreState): readonly ERLink[] =>
    incidentEdges(state.diagram, id)

export const selectSelectedNodes = (): readonly ERNode[] => {
  const diagram = useDiagramStore.getState().diagram
  const ids = useSelectionStore.getState().selectedNodeIds
  const out: ERNode[] = []
  for (const id of ids) {
    const n = diagram.nodesById[id]
    if (n) out.push(n)
  }
  return out
}

export const selectErrorsForId =
  (id: NodeId | string) =>
  (state: ValidationStoreState): readonly ValidationError[] =>
    state.errorsById[id as NodeId] ?? []

export const pickSeverity = (
  errors?: readonly ValidationError[],
): 'none' | 'warning' | 'error' => {
  if (!errors || errors.length === 0) return 'none'
  return errors.some((e) => e.severity === 'error') ? 'error' : 'warning'
}
