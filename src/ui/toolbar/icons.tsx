import type { ReactNode } from 'react'
import {
  MousePointer2,
  Hand,
  Square,
  Diamond,
} from 'lucide-react'
import {
  TbRelationOneToOne,
  TbRelationOneToMany,
  TbRelationManyToMany,
  TbOvalVertical,
} from 'react-icons/tb'
import { GeneralizationIcon, GeneralizationTotalIcon, ConnectIcon } from './legacyIcons'

// Toolbar icon registry. Lucide + react-icons/tb for the tools that have
// a canonical match (select, pan, entity, relationship, attribute, the
// three quick-relationship variants). Custom SVGs ported from the legacy
// editor for ISA placement, total ISA, and the connect tool — legacy
// designed these specifically for Chen semantics and the shapes don't
// exist in lucide / react-icons.
const ICON_SIZE = 18

export const ICONS: Record<string, ReactNode> = {
  select: <MousePointer2 size={ICON_SIZE} aria-hidden />,
  pan: <Hand size={ICON_SIZE} aria-hidden />,

  entity: <Square size={ICON_SIZE} aria-hidden />,
  relationship: <Diamond size={ICON_SIZE} aria-hidden />,
  attribute: <TbOvalVertical size={ICON_SIZE + 2} aria-hidden />,
  isa: <GeneralizationIcon size={ICON_SIZE + 2} />,

  connect: <ConnectIcon size={ICON_SIZE + 2} />,
  quickRelationship11: <TbRelationOneToOne size={ICON_SIZE + 2} aria-hidden />,
  quickRelationship1N: <TbRelationOneToMany size={ICON_SIZE + 2} aria-hidden />,
  quickRelationshipNN: <TbRelationManyToMany size={ICON_SIZE + 2} aria-hidden />,
  quickGeneralization: <GeneralizationIcon size={ICON_SIZE + 2} />,
  quickGeneralizationTotal: <GeneralizationTotalIcon size={ICON_SIZE + 2} />,
}
