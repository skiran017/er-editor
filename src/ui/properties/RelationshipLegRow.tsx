import { useTranslation } from 'react-i18next'
import { useDiagramStore } from '@/state/diagramStore'
import { useSelectionStore } from '@/state/selectionStore'
import type {
  Cardinality,
  EntityNode,
  EntityRelationshipEdge,
  Participation,
} from '@/domain/types'

const CARDINALITIES: readonly Cardinality[] = ['1', 'N', 'M']
const PARTICIPATIONS: readonly Participation[] = ['partial', 'total']

export interface RelationshipLegRowProps {
  readonly edge: EntityRelationshipEdge
  readonly entity: EntityNode
  readonly isRecursive: boolean
  readonly index: number
}

// Single leg card — split out of RelationshipLegsEditor so both components
// stay under the 100-line arrow-function cap.
export const RelationshipLegRow = ({
  edge,
  entity,
  isRecursive,
  index,
}: RelationshipLegRowProps) => {
  const { t } = useTranslation('properties')
  const updateEdge = useDiagramStore((s) => s.updateEdge)
  const select = useSelectionStore((s) => s.select)

  return (
    <div
      className="flex flex-col gap-2 rounded-md border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900/40"
      data-role="relationship-leg"
      data-edge-id={edge.id}
    >
      <button
        type="button"
        onClick={() => select({ nodes: [entity.id], edges: [] })}
        className="truncate text-left text-sm font-medium text-slate-800 hover:text-blue-600 hover:underline dark:text-slate-100 dark:hover:text-blue-400"
        title={t('legs.selectEntity')}
      >
        {entity.name || t('unnamed')}
        {isRecursive && (
          <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">
            ({edge.role || t('legs.defaultRole', { n: index + 1 })})
          </span>
        )}
      </button>

      {isRecursive && (
        <label className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-300">
          {t('role')}
          <input
            type="text"
            value={edge.role ?? ''}
            placeholder={t('rolePlaceholder')}
            onChange={(e) => updateEdge(edge.id, { role: e.target.value || undefined })}
            className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 focus:border-purple-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </label>
      )}

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-300">
          {t('cardinality')}
          <select
            value={edge.cardinality}
            onChange={(e) => updateEdge(edge.id, { cardinality: e.target.value as Cardinality })}
            className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 focus:border-purple-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            {CARDINALITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-300">
          {t('participation')}
          <select
            value={edge.participation}
            onChange={(e) => updateEdge(edge.id, { participation: e.target.value as Participation })}
            className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 focus:border-purple-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            {PARTICIPATIONS.map((p) => (
              <option key={p} value={p}>
                {p === 'total' ? t('participationTotal') : t('participationPartial')}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}
