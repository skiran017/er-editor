import type { TFunction } from 'i18next'
import type { FileAction } from './MenuDropdownBody'

export interface FileActionRowProps {
  readonly item: FileAction
  readonly t: TFunction
}

// Split out of MenuDropdownBody to keep the body under the 100-line
// arrow-function cap. Renders a single file-action menu row, muted + inert
// when the action is disabled (e.g. under exam mode).
export const FileActionRow = ({ item, t }: FileActionRowProps) => {
  const Icon = item.icon
  const disabled = item.disabled === true
  return (
    <button
      type="button"
      role="menuitem"
      aria-disabled={disabled || undefined}
      disabled={disabled}
      onClick={disabled ? undefined : item.onSelect}
      className={
        disabled
          ? 'flex w-full cursor-not-allowed items-center gap-3 px-4 py-2 text-left text-sm text-slate-400 dark:text-slate-500'
          : 'flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700'
      }
    >
      <Icon
        size={18}
        className={disabled ? 'text-slate-300 dark:text-slate-600' : 'text-slate-500 dark:text-slate-400'}
        aria-hidden
      />
      <span className="flex-1">{t(item.labelKey)}</span>
      {item.shortcut && (
        <span
          className={
            disabled
              ? 'font-mono text-xs text-slate-300 dark:text-slate-600'
              : 'font-mono text-xs text-slate-400 dark:text-slate-500'
          }
        >
          {item.shortcut}
        </span>
      )}
    </button>
  )
}
