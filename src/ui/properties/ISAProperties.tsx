import { useTranslation } from 'react-i18next'
import type { ISANode } from '@/domain/types'
import { Checkbox } from '@/ui/primitives'
import { useDiagramStore } from '@/state/diagramStore'

export interface ISAPropertiesProps { readonly node: ISANode }

export const ISAProperties = ({ node }: ISAPropertiesProps) => {
  const { t } = useTranslation('properties')
  const update = useDiagramStore((s) => s.updateNode)
  // Re-read from the store so the editor reflects updates reactively
  // rather than trusting a potentially stale `node` prop.
  const live = useDiagramStore((s) => s.diagram.nodesById[node.id]) as ISANode | undefined
  const current = live && live.kind === 'isa' ? live : node
  return (
    <div className="flex flex-col gap-3 p-3 text-sm" data-role="isa-properties">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('kind.isa')}</h3>
      <Checkbox
        label={t('isTotal')}
        checked={current.isTotal}
        onChange={(e) => update(node.id, { isTotal: e.target.checked } as Partial<ISANode>)}
      />
    </div>
  )
}
