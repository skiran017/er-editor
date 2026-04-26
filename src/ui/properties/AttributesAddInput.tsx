import { useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { useUiStore } from '@/state/uiStore'

export interface AttributesAddInputProps {
  readonly focusClass: string // e.g. 'focus:border-blue-500'
  readonly buttonClass: string // e.g. 'bg-blue-600 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400'
  readonly onAdd: (name: string) => void
}

// Split out of AttributesEditor to keep the parent under the 100-line
// arrow-function lint cap. Pure controlled input with Enter-to-commit.
export const AttributesAddInput = ({
  focusClass,
  buttonClass,
  onAdd,
}: AttributesAddInputProps) => {
  const { t } = useTranslation('properties')
  const readonly = useUiStore((s) => s.readonly)
  const [name, setName] = useState('')

  if (readonly) return null

  const commit = (): void => {
    const trimmed = name.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setName('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commit()
    }
  }

  return (
    <div className="flex items-center gap-2 pt-1">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={t('attr.addPlaceholder')}
        aria-label={t('attr.addLabel')}
        className={`flex-1 rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 ${focusClass}`}
      />
      <button
        type="button"
        onClick={commit}
        disabled={!name.trim()}
        aria-label={t('attr.add')}
        title={t('attr.add')}
        className={`grid h-8 w-8 place-items-center rounded text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${buttonClass}`}
      >
        <Plus size={16} aria-hidden />
      </button>
    </div>
  )
}
