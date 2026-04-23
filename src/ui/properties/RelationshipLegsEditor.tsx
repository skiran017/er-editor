import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useDiagramStore } from '@/state/diagramStore'
import type {
  EntityNode,
  EntityRelationshipEdge,
  NodeId,
} from '@/domain/types'
import { RelationshipLegRow } from './RelationshipLegRow'

export interface RelationshipLegsEditorProps {
  readonly relationshipId: NodeId
}

interface Leg {
  readonly edge: EntityRelationshipEdge
  readonly entity: EntityNode
}

/**
 * Per-leg cardinality / participation editor (the "Connection Details" block
 * from the legacy panel). Lists every entity-relationship edge incident to
 * the selected relationship and inlines each edge's cardinality,
 * participation, and (when recursive) role label — so the user can fill in
 * the whole relationship's semantics without leaving the panel.
 *
 * Recursive detection: the legs resolve to a SINGLE distinct entity but the
 * edge count is ≥ 2. In that case every leg gets a role field so the user
 * can disambiguate (e.g. "manager" / "subordinate").
 */
export const RelationshipLegsEditor = ({ relationshipId }: RelationshipLegsEditorProps) => {
  const { t } = useTranslation('properties')
  const diagram = useDiagramStore((s) => s.diagram)

  const legs = useMemo<readonly Leg[]>(() => {
    const out: Leg[] = []
    for (const eid of diagram.edgeOrder) {
      const edge = diagram.edgesById[eid]
      if (!edge || edge.kind !== 'entity-relationship') continue
      if (edge.targetId !== relationshipId) continue
      const entity = diagram.nodesById[edge.sourceId]
      if (entity && entity.kind === 'entity') {
        out.push({ edge, entity })
      }
    }
    return out
  }, [diagram, relationshipId])

  const distinctEntities = new Set(legs.map((l) => l.entity.id))
  const isRecursive = distinctEntities.size === 1 && legs.length >= 2

  return (
    <section
      className="flex flex-col gap-2 border-t border-slate-200 p-3 dark:border-slate-700"
      data-role="relationship-legs"
      data-recursive={isRecursive || undefined}
    >
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {t('legs.section')}
        </h4>
        {isRecursive && (
          <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
            {t('legs.recursive')}
          </span>
        )}
      </div>

      {legs.length === 0 ? (
        <p className="text-xs italic text-slate-400 dark:text-slate-500">{t('legs.none')}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {legs.map(({ edge, entity }, idx) => (
            <RelationshipLegRow
              key={edge.id}
              edge={edge}
              entity={entity}
              isRecursive={isRecursive}
              index={idx}
            />
          ))}
        </div>
      )}
    </section>
  )
}
