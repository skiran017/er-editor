import type { ToolbarConfig } from '../types'

export const chenToolbar: ToolbarConfig = {
  groups: [
    { id: 'select', labelKey: 'toolbar.group.select', tools: ['select', 'pan'] },
    {
      id: 'elements',
      labelKey: 'toolbar.group.elements',
      // `isa` is intentionally not here — placing a lone ISA node has no
      // semantic value in Chen (it must connect a parent and ≥1 child), so
      // the toolbar surfaces the ISA notation through the two quick flows
      // in the connections group instead: "Generalization (ISA)" (partial)
      // and "Generalization (Total)".
      tools: ['entity', 'relationship', 'attribute'],
    },
    {
      id: 'connections',
      labelKey: 'toolbar.group.connections',
      tools: [
        'connect',
        'quickRelationship11',
        'quickRelationship1N',
        'quickRelationshipNN',
        'quickGeneralization',
        'quickGeneralizationTotal',
      ],
    },
  ],
}
