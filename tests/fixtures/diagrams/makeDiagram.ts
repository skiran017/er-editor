import type { Diagram, ERNode, ERLink } from '@/domain/types'

export const makeDiagram = (
  nodes: readonly ERNode[] = [],
  edges: readonly ERLink[] = [],
): Diagram => ({
  schemaVersion: 1,
  nodesById: Object.fromEntries(nodes.map((n) => [n.id, n])) as Diagram['nodesById'],
  edgesById: Object.fromEntries(edges.map((e) => [e.id, e])) as Diagram['edgesById'],
  nodeOrder: nodes.map((n) => n.id),
  edgeOrder: edges.map((e) => e.id),
})
