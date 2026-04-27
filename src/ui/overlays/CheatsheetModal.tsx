import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { keybindings, type Keybinding, type KeybindingCategory } from '@/interaction/keybindings'
import { Button, KeyboardShortcut } from '@/ui/primitives'
import { useUiStore } from '@/state/uiStore'

const CATEGORIES: readonly KeybindingCategory[] = ['tool', 'operation', 'contextual', 'navigation']

export interface CheatsheetModalProps {
  readonly modalId: string
}

export const CheatsheetModal = ({ modalId }: CheatsheetModalProps) => {
  const { t } = useTranslation('modals')
  const pop = useUiStore((s) => s.popModal)
  const byCategory = useMemo(() => {
    const out: Record<KeybindingCategory, Keybinding[]> = {
      tool: [],
      operation: [],
      contextual: [],
      navigation: [],
    }
    for (const kb of keybindings) {
      const list = (out[kb.category] ??= [])
      list.push(kb)
    }
    return out
  }, [])

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 dark:bg-black/60"
      role="dialog"
      aria-modal
      aria-labelledby={`${modalId}-title`}
      data-modal-id={modalId}
      data-kind="cheatsheet"
    >
      <div className="flex max-h-[80vh] w-[min(640px,calc(100vw-1rem))] flex-col rounded bg-white p-4 text-slate-900 shadow-lg dark:bg-slate-800 dark:text-slate-100">
        <h2 id={`${modalId}-title`} className="mb-3 text-base font-semibold">{t('cheatsheet.title')}</h2>
        <div className="flex-1 overflow-auto">
          {CATEGORIES.map(
            (cat) =>
              byCategory[cat].length > 0 && (
                <section key={cat} className="mb-4">
                  <h3 className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {t(`cheatsheet.category.${cat}`)}
                  </h3>
                  <ul className="flex flex-col gap-1">
                    {byCategory[cat].map((kb) => (
                      <li
                        key={kb.id}
                        className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300"
                      >
                        <span>{t(kb.descriptionKey)}</span>
                        <span className="flex gap-1">
                          {kb.keys.map((k) => (
                            <KeyboardShortcut key={k} combo={k} />
                          ))}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ),
          )}
        </div>
        <div className="mt-3 flex justify-end">
          <Button variant="primary" onClick={pop}>
            {t('close', { ns: 'common' })}
          </Button>
        </div>
      </div>
    </div>
  )
}
