import type { NodeChange, EdgeChange } from '@xyflow/react'
import type { NodeId, EdgeId, ERNode } from '@/domain/types'
import type { DiagramPatch } from '@/state/types'

/**
 * Translate React-Flow controlled-mode change lists into a DiagramPatch.
 *
 * Consumes only the subset of changes the FSM does NOT own:
 *   - 'position'   → updateNodes[].patch.position (drag)
 *   - 'dimensions' → updateNodes[].patch.size     (resize)
 *   - 'remove'     → removeNodes / removeEdges    (keyboard/context-menu delete)
 *
 * Deliberately ignored:
 *   - 'select' — selection lives in selectionStore and is driven by the Phase 3 FSM
 *   - 'add'    — node/edge creation only happens via explicit store actions
 *                (FSM placeNode / connectNodes)
 *
 * Empty-array fields are omitted so `applyPatch` short-circuits cheaply.
 */

type NodePatch = Partial<ERNode>

export const rfToDiagramPatch = (
  nodeChanges: readonly NodeChange[],
  edgeChanges: readonly EdgeChange[],
): DiagramPatch => {
  const byId = new Map<NodeId, NodePatch>()
  const removeNodes: NodeId[] = []
  const removeEdges: EdgeId[] = []

  for (const c of nodeChanges) {
    if (c.type === 'position') {
      if (!c.position) continue // mid-drag frames without a position fire too
      const id = c.id as NodeId
      byId.set(id, {
        ...byId.get(id),
        position: { x: c.position.x, y: c.position.y },
      })
    } else if (c.type === 'dimensions') {
      if (!c.dimensions) continue
      const id = c.id as NodeId
      byId.set(id, {
        ...byId.get(id),
        size: { width: c.dimensions.width, height: c.dimensions.height },
      })
    } else if (c.type === 'remove') {
      removeNodes.push(c.id as NodeId)
    }
    // 'select' and 'add' deliberately skipped — see module doc.
  }

  for (const c of edgeChanges) {
    if (c.type === 'remove') removeEdges.push(c.id as EdgeId)
  }

  const patch: {
    -readonly [K in keyof DiagramPatch]: DiagramPatch[K]
  } = {}
  if (byId.size) {
    patch.updateNodes = [...byId.entries()].map(([id, nodePatch]) => ({
      id,
      patch: nodePatch,
    }))
  }
  if (removeNodes.length) patch.removeNodes = removeNodes
  if (removeEdges.length) patch.removeEdges = removeEdges
  return patch
}
