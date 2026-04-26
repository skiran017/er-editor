import type { TFunction } from 'i18next'
import type { FileAction } from './MenuDropdownBody'

export interface FileActionRowProps {
  readonly item: FileAction
  readonly t: TFunction
}

// Single file-action menu row. Security-gated actions (Open / Save / Export
// under exam mode) are filtered out upstream — those are HIDDEN, never
// rendered with `disabled`, since a disabled attribute is one devtools
// flick from being flipped back on. The `disabled` flag here is for UX
// gating only (e.g. Save / Export on an empty canvas).
export const FileActionRow = ({ item, t }: FileActionRowProps) => {
  const Icon = item.icon
  return (
    <button
      type="button"
      role="menuitem"
      onClick={item.onSelect}
      disabled={item.disabled}
      className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent dark:text-slate-200 dark:hover:bg-slate-700 dark:disabled:hover:bg-transparent"
    >
      <Icon size={18} className="text-slate-500 dark:text-slate-400" aria-hidden />
      <span className="flex-1">{t(item.labelKey)}</span>
      {item.shortcut && (
        <span className="hidden font-mono text-xs text-slate-400 sm:inline dark:text-slate-500">{item.shortcut}</span>
      )}
    </button>
  )
}
