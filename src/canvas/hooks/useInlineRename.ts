import { useCallback } from 'react'
import type { NodeId, ERNode } from '@/domain/types'
import { useUiStore } from '@/state/uiStore'
import { useDiagramStore } from '@/state/diagramStore'

export interface InlineRenameApi {
  readonly active: { readonly nodeId: NodeId; readonly initialValue: string } | null
  readonly start: (nodeId: NodeId) => void
  readonly commit: (value: string) => void
  readonly cancel: () => void
}

const hasNameField = (n: ERNode): n is Extract<ERNode, { name: string }> =>
  n.kind === 'entity' || n.kind === 'relationship' || n.kind === 'attribute'

export const useInlineRename = (): InlineRenameApi => {
  const active = useUiStore((s) => s.inlineRename)
  const startAction = useUiStore((s) => s.startInlineRename)
  const cancelAction = useUiStore((s) => s.cancelInlineRename)

  const start = useCallback((nodeId: NodeId) => {
    const node = useDiagramStore.getState().diagram.nodesById[nodeId]
    if (!node || !hasNameField(node)) return // ISA has no name — no-op
    startAction({ nodeId, initialValue: node.name })
  }, [startAction])

  const commit = useCallback((value: string) => {
    const current = useUiStore.getState().inlineRename
    if (!current) return
    const trimmed = value.trim()
    if (trimmed) useDiagramStore.getState().updateNode(current.nodeId, { name: trimmed } as Partial<ERNode>)
    cancelAction()
  }, [cancelAction])

  const cancel = useCallback(() => { cancelAction() }, [cancelAction])

  return { active, start, commit, cancel }
}
