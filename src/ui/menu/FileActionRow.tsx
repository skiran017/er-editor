import type { TFunction } from 'i18next'
import type { FileAction } from './MenuDropdownBody'

export interface FileActionRowProps {
  readonly item: FileAction
  readonly t: TFunction
}

// Single file-action menu row. Gated actions (Open / Save / Export under
// exam mode) are filtered out upstream — we render exactly what reaches us,
// no disabled branch. A `disabled` attribute is one devtools flick from
// being flipped back on, so hiding is the lockdown mechanism, not styling.
export const FileActionRow = ({ item, t }: FileActionRowProps) => {
  const Icon = item.icon
  return (
    <button
      type="button"
      role="menuitem"
      onClick={item.onSelect}
      className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
    >
      <Icon size={18} className="text-slate-500 dark:text-slate-400" aria-hidden />
      <span className="flex-1">{t(item.labelKey)}</span>
      {item.shortcut && (
        <span className="font-mono text-xs text-slate-400 dark:text-slate-500">{item.shortcut}</span>
      )}
    </button>
  )
}
