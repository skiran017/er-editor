import type { ComponentType } from 'react'
import { useTranslation } from 'react-i18next'
import { Key, Trash2 } from 'lucide-react'
import { useDiagramStore } from '@/state/diagramStore'
import type { AttributeNode } from '@/domain/types'

interface ChipConfig {
  readonly field: 'isKey' | 'isDiscriminant' | 'isMultivalued' | 'isDerived'
  readonly labelKey: string
  readonly colorClass: string // text + focus ring + accent
  readonly icon?: ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }>
}

// Color palette ported from legacy:
//   Key          → yellow
//   Discriminant → orange
//   Multivalued  → blue
//   Derived      → purple
// `accent-*` wires the native checkbox tick colour in modern browsers.
const CHIPS: readonly ChipConfig[] = [
  {
    field: 'isKey',
    labelKey: 'attr.key',
    colorClass: 'text-yellow-700 dark:text-yellow-400 accent-yellow-600',
    icon: Key,
  },
  {
    field: 'isDiscriminant',
    labelKey: 'attr.discriminant',
    colorClass: 'text-orange-700 dark:text-orange-400 accent-orange-600',
  },
  {
    field: 'isMultivalued',
    labelKey: 'attr.multivalued',
    colorClass: 'text-blue-700 dark:text-blue-400 accent-blue-600',
  },
  {
    field: 'isDerived',
    labelKey: 'attr.derived',
    colorClass: 'text-purple-700 dark:text-purple-400 accent-purple-600',
  },
]

export interface AttributeRowProps {
  readonly attribute: AttributeNode
}

/**
 * Single attribute row used inside AttributesEditor. Visual-match to legacy
 * (color-coded chips): Key/Discriminant/Multivalued/Derived each get their
 * own palette hint so the modifier mix is scannable at a glance.
 *
 * Key and Discriminant are mutually exclusive (a discriminant is a *partial*
 * key scoped to a weak entity's owner). Toggling either off the other —
 * same rule the legacy panel enforced.
 */
export const AttributeRow = ({ attribute }: AttributeRowProps) => {
  const { t } = useTranslation('properties')
  const updateNode = useDiagramStore((s) => s.updateNode)
  const removeNode = useDiagramStore((s) => s.removeNode)

  const patch = (p: Partial<AttributeNode>) => {
    updateNode(attribute.id, p as Partial<AttributeNode>)
  }

  const handleToggle = (field: ChipConfig['field']) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked
    // Enforce Key ⊻ Discriminant mutual exclusion.
    if (field === 'isKey') {
      patch({ isKey: checked, ...(checked ? { isDiscriminant: false } : null) })
    } else if (field === 'isDiscriminant') {
      patch({ isDiscriminant: checked, ...(checked ? { isKey: false } : null) })
    } else {
      patch({ [field]: checked } as Partial<AttributeNode>)
    }
  }

  return (
    <div
      className="flex flex-col gap-2 rounded-md border border-slate-200 bg-slate-50 p-2 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:bg-slate-800"
      data-role="attribute-row"
      data-attribute-id={attribute.id}
    >
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={attribute.name}
          onChange={(e) => patch({ name: e.target.value })}
          aria-label={t('name')}
          placeholder={t('attr.namePlaceholder')}
          className="flex-1 rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
        <button
          type="button"
          onClick={() => removeNode(attribute.id)}
          aria-label={t('attr.delete')}
          title={t('attr.delete')}
          className="grid h-7 w-7 place-items-center rounded text-red-500 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300"
        >
          <Trash2 size={14} aria-hidden />
        </button>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {CHIPS.map((chip) => {
          const Icon = chip.icon
          return (
            <label
              key={chip.field}
              className={`flex cursor-pointer items-center gap-1 ${chip.colorClass}`}
            >
              <input
                type="checkbox"
                checked={attribute[chip.field]}
                onChange={handleToggle(chip.field)}
                className="h-3.5 w-3.5 rounded border-slate-300 focus:ring-1 dark:border-slate-600"
              />
              {Icon && <Icon size={12} aria-hidden />}
              <span>{t(chip.labelKey)}</span>
            </label>
          )
        })}
      </div>
    </div>
  )
}
