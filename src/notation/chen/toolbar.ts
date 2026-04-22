import type { ToolbarConfig } from '../types'

export const chenToolbar: ToolbarConfig = {
  groups: [
    { id: 'select', labelKey: 'toolbar.group.select', tools: ['select', 'pan'] },
    {
      id: 'elements',
      labelKey: 'toolbar.group.elements',
      tools: ['entity', 'relationship', 'attribute', 'isa'],
    },
    {
      id: 'connections',
      labelKey: 'toolbar.group.connections',
      tools: ['connect', 'quickRelationship', 'quickGeneralization'],
    },
  ],
}
