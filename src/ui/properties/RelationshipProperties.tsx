import { useTranslation } from 'react-i18next'
import type { RelationshipNode } from '@/domain/types'
import { TextInput, Checkbox } from '@/ui/primitives'
import { useDiagramStore } from '@/state/diagramStore'

export interface RelationshipPropertiesProps { readonly node: RelationshipNode }

export const RelationshipProperties = ({ node }: RelationshipPropertiesProps) => {
  const { t } = useTranslation('properties')
  const update = useDiagramStore((s) => s.updateNode)
  // Re-read from the store so the editor reflects updates after each keystroke
  // rather than trusting a potentially stale `node` prop.
  const live = useDiagramStore((s) => s.diagram.nodesById[node.id]) as RelationshipNode | undefined
  const current = live && live.kind === 'relationship' ? live : node
  return (
    <div className="flex flex-col gap-3 p-3 text-sm" data-role="relationship-properties">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('kind.relationship')}</h3>
      <TextInput
        label={t('name')}
        value={current.name}
        onChange={(e) => update(node.id, { name: e.target.value } as Partial<RelationshipNode>)}
      />
      <Checkbox
        label={t('isIdentifying')}
        checked={current.isIdentifying}
        onChange={(e) => update(node.id, { isIdentifying: e.target.checked } as Partial<RelationshipNode>)}
      />
    </div>
  )
}
