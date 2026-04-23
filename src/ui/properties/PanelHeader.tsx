import type { ComponentType } from 'react'
import { useTranslation } from 'react-i18next'
import { Database, Circle, Link, GitBranch, Trash2 } from 'lucide-react'
import { useSelectionStore } from '@/state/selectionStore'
import { useInteractionStore } from '@/interaction/interactionStore'
import type { NodeKind, EdgeKind } from '@/domain/types'

export type PanelKind = NodeKind | EdgeKind

export interface PanelHeaderProps {
  readonly titleKey: string
  readonly kind: PanelKind
}

interface KindStyle {
  readonly icon: ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }>
  readonly color: string // tailwind text color utility (light + dark)
}

// Color coding ported from legacy (PropertyPanel.tsx):
//   Database+blue   → Entity
//   Database+purple → Relationship
//   Circle+green    → Attribute
//   GitBranch       → Generalization (ISA) — legacy had no icon, use GitBranch
//   Link+green      → every edge kind
const KIND_STYLES: Record<PanelKind, KindStyle> = {
  entity: { icon: Database, color: 'text-blue-600 dark:text-blue-400' },
  relationship: { icon: Database, color: 'text-purple-600 dark:text-purple-400' },
  attribute: { icon: Circle, color: 'text-green-600 dark:text-green-400' },
  isa: { icon: GitBranch, color: 'text-amber-600 dark:text-amber-400' },
  'entity-relationship': { icon: Link, color: 'text-green-600 dark:text-green-400' },
  'attribute-of': { icon: Link, color: 'text-green-600 dark:text-green-400' },
  'isa-link': { icon: Link, color: 'text-green-600 dark:text-green-400' },
}

export const PanelHeader = ({ titleKey, kind }: PanelHeaderProps) => {
  const { t } = useTranslation('properties')
  const clear = useSelectionStore((s) => s.clear)
  const style = KIND_STYLES[kind]
  const Icon = style.icon

  return (
    <header
      className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2 dark:border-slate-700"
      data-role="panel-header"
      data-kind={kind}
    >
      <Icon size={18} className={style.color} aria-hidden />
      <h2 className="flex-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
        {t(titleKey)}
      </h2>
      <button
        type="button"
        onClick={() => {
          useInteractionStore.getState().send({ type: 'DELETE' })
        }}
        aria-label={t('delete')}
        title={t('delete')}
        className="grid h-7 w-7 place-items-center rounded text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300"
        data-role="panel-delete"
      >
        <Trash2 size={16} aria-hidden />
      </button>
      <button
        type="button"
        onClick={clear}
        aria-label={t('close')}
        title={t('close')}
        className="grid h-7 w-7 place-items-center rounded text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
        data-role="panel-close"
      >
        <svg viewBox="0 0 14 14" width={12} height={12} aria-hidden="true">
          <path
            d="M2 2 L12 12 M12 2 L2 12"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </button>
    </header>
  )
}
