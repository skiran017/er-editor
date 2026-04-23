import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useDiagramStore } from '@/state/diagramStore'
import { useSelectionStore } from '@/state/selectionStore'
import type { NodeId, ERNode } from '@/domain/types'

export interface ConnectionsListProps {
  readonly nodeId: NodeId
}

interface ConnectionRow {
  readonly edgeId: string
  readonly otherId: NodeId
  readonly otherLabel: string
  readonly kindLabel: string
}

const nodeLabel = (n: ERNode | undefined, fallback: string): string => {
  if (!n) return fallback
  if (n.kind === 'isa') return 'ISA'
  return n.name.trim() || fallback
}

export const ConnectionsList = ({ nodeId }: ConnectionsListProps) => {
  const { t } = useTranslation('properties')
  // Subscribe to the stable diagram reference (changes only on mutation).
  // Deriving rows inside the selector would return a new array every call and
  // cause an infinite render loop via zustand's strict-equality check.
  const diagram = useDiagramStore((s) => s.diagram)
  const rows: readonly ConnectionRow[] = useMemo(() => {
    const out: ConnectionRow[] = []
    for (const eid of diagram.edgeOrder) {
      const e = diagram.edgesById[eid]
      if (!e) continue
      const touchesSource = e.sourceId === nodeId
      const touchesTarget = e.targetId === nodeId
      if (!touchesSource && !touchesTarget) continue
      const otherId = touchesSource ? e.targetId : e.sourceId
      out.push({
        edgeId: e.id,
        otherId,
        otherLabel: nodeLabel(diagram.nodesById[otherId], t('unnamed')),
        kindLabel: t(`kind.${e.kind}`),
      })
    }
    return out
  }, [diagram, nodeId, t])

  const select = useSelectionStore((s) => s.select)

  return (
    <section
      className="flex flex-col gap-1 border-t border-slate-200 p-3"
      data-role="connections-list"
    >
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {t('connections')} ({rows.length})
      </h4>
      {rows.length === 0 ? (
        <p className="text-xs italic text-slate-400">{t('noConnections')}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {rows.map((r) => (
            <li key={r.edgeId}>
              <button
                type="button"
                onClick={() => select({ nodes: [r.otherId], edges: [] })}
                className="flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left text-sm hover:bg-slate-100"
              >
                <span className="truncate">{r.otherLabel}</span>
                <span className="shrink-0 text-[10px] uppercase tracking-wide text-slate-400">
                  {r.kindLabel}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
