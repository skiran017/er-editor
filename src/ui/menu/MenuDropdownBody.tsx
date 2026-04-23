import type { TFunction } from 'i18next'
import type { ComponentType } from 'react'
import type { Theme } from '@/state/uiStore'

export interface FileAction {
  readonly id: string
  readonly labelKey: string
  readonly icon: ComponentType<{ size?: number; className?: string }>
  readonly shortcut?: string
  readonly onSelect: () => void
}

export interface ThemeOption {
  readonly value: Theme
  readonly icon: ComponentType<{ size?: number; className?: string }>
  readonly labelKey: string
}

export interface MenuDropdownBodyProps {
  readonly t: TFunction
  readonly fileActions: readonly FileAction[]
  readonly themes: readonly ThemeOption[]
  readonly theme: Theme
  readonly onSetTheme: (t: Theme) => void
  readonly validationEnabled: boolean
  readonly onSetValidationEnabled: (b: boolean) => void
  readonly onShortcuts: () => void
  readonly onReset: () => void
  readonly onClickOutside: () => void
  readonly resetIcon: ComponentType<{ size?: number; className?: string }>
  readonly keyboardIcon: ComponentType<{ size?: number; className?: string }>
}

// Split out of Menu.tsx so the outer component stays under the lint cap for
// arrow-function length. This component is pure presentation — every handler
// is provided by the parent.
export const MenuDropdownBody = ({
  t,
  fileActions,
  themes,
  theme,
  onSetTheme,
  validationEnabled,
  onSetValidationEnabled,
  onShortcuts,
  onReset,
  onClickOutside,
  resetIcon: ResetIcon,
  keyboardIcon: KeyboardIcon,
}: MenuDropdownBodyProps) => (
  <>
    <div aria-hidden className="fixed inset-0 z-30" onClick={onClickOutside} />
    <div
      role="menu"
      aria-label={t('menu:app.title')}
      className="absolute left-0 top-12 z-40 w-64 rounded-lg border border-slate-200 bg-white/95 py-2 shadow-xl backdrop-blur-md dark:border-slate-700 dark:bg-slate-800/95"
    >
      {fileActions.map((item) => {
        const Icon = item.icon
        return (
          <button
            key={item.id}
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
      })}

      <div className="my-2 h-px bg-slate-200 dark:bg-slate-700" aria-hidden />

      <label className="flex cursor-pointer items-center justify-between px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700">
        <span>{t('menu:app.validation')}</span>
        <input
          type="checkbox"
          aria-label={t('menu:app.validation')}
          checked={validationEnabled}
          onChange={(e) => onSetValidationEnabled(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
      </label>

      <button
        type="button"
        role="menuitem"
        onClick={onShortcuts}
        className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
      >
        <KeyboardIcon size={18} className="text-slate-500 dark:text-slate-400" aria-hidden />
        <span className="flex-1 dark:text-slate-200 ">{t('menu:help.cheatsheet')}</span>
        <span className="font-mono text-xs text-slate-400 dark:text-slate-500">?</span>
      </button>

      <div className="my-2 h-px bg-slate-200 dark:bg-slate-700" aria-hidden />

      <div className="px-4 py-2">
        <div className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">{t('menu:app.theme')}</div>
        <div className="flex items-center gap-2" role="radiogroup" aria-label={t('menu:app.theme')}>
          {themes.map((opt) => {
            const Icon = opt.icon
            const active = theme === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={t(opt.labelKey)}
                title={t(opt.labelKey)}
                onClick={() => onSetTheme(opt.value)}
                className={`flex flex-1 items-center justify-center rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Icon size={16} aria-hidden />
              </button>
            )
          })}
        </div>
      </div>

      <button
        type="button"
        role="menuitem"
        onClick={onReset}
        className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
      >
        <ResetIcon size={18} aria-hidden />
        <span className="flex-1">{t('menu:app.reset')}</span>
      </button>
    </div>
  </>
)
