import { useTranslation } from 'react-i18next'
import type { AttributeNode } from '@/domain/types'
import { TextInput, Checkbox } from '@/ui/primitives'
import { useDiagramStore } from '@/state/diagramStore'

export interface AttributePropertiesProps { readonly node: AttributeNode }

export const AttributeProperties = ({ node }: AttributePropertiesProps) => {
  const { t } = useTranslation('properties')
  const update = useDiagramStore((s) => s.updateNode)
  // Re-read from the store so the editor reflects updates after each keystroke
  // rather than trusting a potentially stale `node` prop.
  const live = useDiagramStore((s) => s.diagram.nodesById[node.id]) as AttributeNode | undefined
  const current = live && live.kind === 'attribute' ? live : node
  const patch = (p: Partial<AttributeNode>): void => { update(node.id, p as Partial<AttributeNode>) }
  return (
    <div className="flex flex-col gap-3 p-3 text-sm" data-role="attribute-properties">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('kind.attribute')}</h3>
      <TextInput
        label={t('name')}
        value={current.name}
        onChange={(e) => patch({ name: e.target.value })}
      />
      <Checkbox
        label={t('isKey')}
        checked={current.isKey}
        onChange={(e) => patch({ isKey: e.target.checked })}
      />
      <Checkbox
        label={t('isDiscriminant')}
        checked={current.isDiscriminant}
        onChange={(e) => patch({ isDiscriminant: e.target.checked })}
      />
      <Checkbox
        label={t('isMultivalued')}
        checked={current.isMultivalued}
        onChange={(e) => patch({ isMultivalued: e.target.checked })}
      />
      <Checkbox
        label={t('isDerived')}
        checked={current.isDerived}
        onChange={(e) => patch({ isDerived: e.target.checked })}
      />
      <Checkbox
        label={t('isComposite')}
        checked={current.isComposite}
        onChange={(e) => patch({ isComposite: e.target.checked })}
      />
    </div>
  )
}
