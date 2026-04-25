import { useTranslation } from 'react-i18next'
import type { Language } from '@/state/uiStore'

interface Option {
  readonly value: Language
  readonly labelKey: string
  readonly short: string
}

const OPTIONS: readonly Option[] = [
  { value: 'en', labelKey: 'menu:app.languageEn', short: 'EN' },
  { value: 'it', labelKey: 'menu:app.languageIt', short: 'IT' },
]

export interface LanguageToggleProps {
  readonly value: Language
  readonly onChange: (next: Language) => void
}

export const LanguageToggle = ({ value, onChange }: LanguageToggleProps) => {
  const { t } = useTranslation(['menu'])
  return (
    <div
      role="radiogroup"
      aria-label={t('menu:app.language')}
      data-role="language-toggle"
      className="flex items-center gap-2"
    >
      {OPTIONS.map((opt) => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={t(opt.labelKey)}
            title={t(opt.labelKey)}
            onClick={() => { if (!active) onChange(opt.value) }}
            className={`flex flex-1 items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {opt.short}
          </button>
        )
      })}
    </div>
  )
}
