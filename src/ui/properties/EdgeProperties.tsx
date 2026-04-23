import { useTranslation } from 'react-i18next'
import type { ERLink, EntityRelationshipEdge, Cardinality, Participation } from '@/domain/types'
import { TextInput } from '@/ui/primitives'
import { useDiagramStore } from '@/state/diagramStore'

export interface EdgePropertiesProps { readonly edge: ERLink }

const CARDINALITIES: readonly Cardinality[] = ['1', 'N', 'M']
const PARTICIPATIONS: readonly Participation[] = ['total', 'partial']

const EREdge = ({ edge }: { edge: EntityRelationshipEdge }) => {
  const { t } = useTranslation('properties')
  const update = useDiagramStore((s) => s.updateEdge)
  const live = useDiagramStore((s) => s.diagram.edgesById[edge.id]) as EntityRelationshipEdge | undefined
  const current = live && live.kind === 'entity-relationship' ? live : edge
  return (
    <>
      <label className="flex flex-col gap-1 text-xs text-slate-700 dark:text-slate-200">
        {t('cardinality')}
        <select
          className="h-9 rounded border border-slate-300 bg-white px-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          value={current.cardinality}
          onChange={(e) => update(edge.id, { cardinality: e.target.value as Cardinality })}
        >
          {CARDINALITIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-slate-700 dark:text-slate-200">
        {t('participation')}
        <select
          className="h-9 rounded border border-slate-300 bg-white px-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          value={current.participation}
          onChange={(e) => update(edge.id, { participation: e.target.value as Participation })}
        >
          {PARTICIPATIONS.map((p) => (
            <option key={p} value={p}>
              {p === 'total' ? t('participationTotal') : t('participationPartial')}
            </option>
          ))}
        </select>
      </label>
      <TextInput
        label={t('role')}
        value={current.role ?? ''}
        placeholder={t('rolePlaceholder')}
        onChange={(e) => update(edge.id, { role: e.target.value || undefined })}
      />
    </>
  )
}

export const EdgeProperties = ({ edge }: EdgePropertiesProps) => {
  const { t } = useTranslation('properties')
  return (
    <div className="flex flex-col gap-3 p-3 text-sm" data-role="edge-properties" data-edge-kind={edge.kind}>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t(`kind.${edge.kind}`)}</h3>
      {edge.kind === 'entity-relationship' && <EREdge edge={edge} />}
      {edge.kind !== 'entity-relationship' && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Source: {edge.sourceId}<br />
          Target: {edge.targetId}
        </p>
      )}
    </div>
  )
}
