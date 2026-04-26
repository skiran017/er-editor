import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useUiStore } from '@/state/uiStore'
import { KeyboardShortcut } from '@/ui/primitives'

export const ContextMenu = () => {
  const cm = useUiStore((s) => s.contextMenu)
  const close = useUiStore((s) => s.closeContextMenu)
  const { t } = useTranslation()

  useEffect(() => {
    if (!cm) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    const onScroll = () => close()
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, { capture: true })
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, { capture: true })
    }
  }, [cm, close])

  if (!cm) return null
  const { at, items } = cm
  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={close}
        onContextMenu={(e) => { e.preventDefault(); close() }}
      />
      <ul
        role="menu"
        data-role="context-menu"
        className="fixed z-50 min-w-[200px] max-w-[calc(100vw-1rem)] rounded border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800"
        style={{ left: at.x, top: at.y }}
      >
        {items.map((it) => (
          <li key={it.id}>
            <button
              type="button"
              role="menuitem"
              disabled={it.disabled}
              onClick={() => { it.onSelect(); close() }}
              className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-700 ${
                it.danger
                  ? 'text-red-700 dark:text-red-300'
                  : 'text-slate-800 dark:text-slate-100'
              }`}
            >
              <span>{t(it.labelKey)}</span>
              {it.shortcut && <KeyboardShortcut combo={it.shortcut} />}
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}
