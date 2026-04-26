import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Menu as MenuIcon,
  X,
  Upload,
  Download,
  Image as ImageIcon,
  Keyboard,
  Trash2,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react'
import { useUiStore } from '@/state/uiStore'
import { useValidationStore } from '@/state/validationStore'
import { useDiagramStore } from '@/state/diagramStore'
import { useInteractionStore } from '@/interaction/interactionStore'
import { emptyDiagram } from '@/domain/types'
import {
  MenuDropdownBody,
  type FileAction,
  type ThemeOption,
} from './MenuDropdownBody'

const THEMES: readonly ThemeOption[] = [
  { value: 'light', icon: Sun, labelKey: 'menu:app.themeLight' },
  { value: 'dark', icon: Moon, labelKey: 'menu:app.themeDark' },
  { value: 'system', icon: Monitor, labelKey: 'menu:app.themeSystem' },
]

/**
 * Hamburger dropdown menu (top-left). Replaces the classic File/Edit/View/Help
 * menubar with the legacy-app layout: Open / Save / Export (file group),
 * Validation toggle, Keyboard shortcuts, Theme selector, Reset canvas.
 *
 * File-I/O items still toast "Available in Phase 5" — the real codecs land
 * with Phase 5; this surfaces the menu shape so Phase 6 UI work is complete.
 *
 * Undo / Redo intentionally moved to the toolbar (matching legacy). The
 * keyboard shortcuts still dispatch UNDO / REDO through the FSM regardless.
 */
export const Menu = () => {
  const { t } = useTranslation('menu')
  const [isOpen, setIsOpen] = useState(false)

  const theme = useUiStore((s) => s.theme)
  const setTheme = useUiStore((s) => s.setTheme)
  const language = useUiStore((s) => s.language)
  const setLanguage = useUiStore((s) => s.setLanguage)
  const pushToast = useUiStore((s) => s.pushToast)
  // Exam mode gates file I/O + the Validation toggle. Sourced from the URL
  // (`?examMode=true` or default-on under `?embed=true`) during startup.
  const examMode = useUiStore((s) => s.examMode)
  const readonly = useUiStore((s) => s.readonly)
  const embed = useUiStore((s) => s.embed)

  const validationEnabled = useValidationStore((s) => s.enabled)
  const setValidationEnabled = useValidationStore((s) => s.setEnabled)

  // Close on Escape so the menu feels like a real dropdown.
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen])

  const close = () => setIsOpen(false)

  const toastPhase5 = () => {
    pushToast({ id: `phase5-${Date.now()}`, kind: 'info', messageKey: 'menu:notYetAvailable' })
    close()
  }

  const handleShortcuts = () => {
    useInteractionStore.getState().send({ type: 'TOGGLE_CHEATSHEET' })
    close()
  }

  const handleReset = () => {
    // Defence-in-depth: the Reset row is hidden in readonly mode (showReset
    // prop), but a DevTools flick that re-renders the button would otherwise
    // call this handler — which writes diagramStore directly, bypassing the
    // FSM gate from Task 8. Mirror the examMode-locked file actions.
    if (readonly) return
    // Confirm via window.confirm — modal-less for now. Phase 6 can replace
    // this with a ModalStack-driven AlertDialog once a modal primitive exists.
    if (!window.confirm(t('menu:app.resetConfirm'))) return
    useDiagramStore.setState({ diagram: emptyDiagram() })
    useDiagramStore.temporal.getState().clear()
    pushToast({
      id: `reset-${Date.now()}`,
      kind: 'success',
      messageKey: 'menu:app.resetDone',
    })
    close()
  }

  // Hide entire menu chrome under embed (iframe/Moodle host provides its own UI).
  if (embed) return null

  // File actions vanish entirely under exam mode. Hiding rather than
  // disabling is the honest lockdown — a disabled attribute on a button is
  // one devtools flick away from being re-enabled and clicked. The Reset,
  // Shortcuts, and Theme controls stay live because they're UX, not data.
  const fileActions: readonly FileAction[] = examMode
    ? []
    : [
        { id: 'open', labelKey: 'menu:file.open', icon: Upload, shortcut: 'Ctrl+O', onSelect: toastPhase5 },
        { id: 'save', labelKey: 'menu:file.save', icon: Download, shortcut: 'Ctrl+S', onSelect: toastPhase5 },
        { id: 'exportImage', labelKey: 'menu:file.exportPng', icon: ImageIcon, onSelect: toastPhase5 },
      ]

  return (
    <div className="fixed left-4 top-4 z-40">
      <button
        type="button"
        aria-label={t('menu:app.title')}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        title={t('menu:app.title')}
        onClick={() => setIsOpen((v) => !v)}
        className="rounded-md border border-slate-200 bg-white/90 p-2 text-slate-700 shadow-lg backdrop-blur-md transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:bg-slate-700"
      >
        {isOpen ? <X size={18} aria-hidden /> : <MenuIcon size={18} aria-hidden />}
      </button>

      {isOpen && (
        <MenuDropdownBody
          t={t}
          fileActions={fileActions}
          themes={THEMES}
          theme={theme}
          onSetTheme={setTheme}
          language={language}
          onSetLanguage={setLanguage}
          validationEnabled={validationEnabled}
          onSetValidationEnabled={setValidationEnabled}
          examMode={examMode}
          onShortcuts={handleShortcuts}
          onReset={handleReset}
          onClickOutside={close}
          resetIcon={Trash2}
          keyboardIcon={Keyboard}
          showReset={!readonly}
        />
      )}
    </div>
  )
}
