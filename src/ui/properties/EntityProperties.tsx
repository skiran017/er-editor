import { useTranslation } from 'react-i18next'
import type { EntityNode } from '@/domain/types'
import { TextInput, Checkbox } from '@/ui/primitives'
import { useDiagramStore } from '@/state/diagramStore'
import { AttributesEditor } from './AttributesEditor'

export interface EntityPropertiesProps { readonly node: EntityNode }

export const EntityProperties = ({ node }: EntityPropertiesProps) => {
  const { t } = useTranslation('properties')
  const update = useDiagramStore((s) => s.updateNode)
  // Re-read from the store so the editor reflects updates after each keystroke
  // rather than trusting a potentially stale `node` prop.
  const live = useDiagramStore((s) => s.diagram.nodesById[node.id]) as EntityNode | undefined
  const current = live && live.kind === 'entity' ? live : node
  return (
    <div data-role="entity-properties">
      <div className="flex flex-col gap-3 p-3 text-sm">
        <TextInput
          label={t('name')}
          value={current.name}
          onChange={(e) => update(node.id, { name: e.target.value } as Partial<EntityNode>)}
        />
        <Checkbox
          label={t('isWeak')}
          checked={current.isWeak}
          onChange={(e) => update(node.id, { isWeak: e.target.checked } as Partial<EntityNode>)}
        />
      </div>
      <AttributesEditor parentId={node.id} accent="blue" />
    </div>
  )
}
