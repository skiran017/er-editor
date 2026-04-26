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
import { useExportHandlers } from './useExportHandlers'
import { useFileActions } from './useFileActions'

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
  const pushModal = useUiStore((s) => s.pushModal)
  // Exam mode gates file I/O + the Validation toggle. Sourced from the URL
  // (`?examMode=true` or default-on under `?embed=true`) during startup.
  const examMode = useUiStore((s) => s.examMode)
  const readonly = useUiStore((s) => s.readonly)
  const embed = useUiStore((s) => s.embed)

  const validationEnabled = useValidationStore((s) => s.enabled)
  const setValidationEnabled = useValidationStore((s) => s.setEnabled)
  // Save / Export are pointless on a blank canvas — gate them on whether the
  // diagram has any nodes at all. Subscribed via a length selector so the
  // Menu re-renders the disabled state as soon as the first node is added
  // (or the last one removed).
  const isCanvasEmpty = useDiagramStore((s) => s.diagram.nodeOrder.length === 0)

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

  const { exportPng, exportSvg } = useExportHandlers(close)
  const fileActionsHook = useFileActions(close)

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
    // Defer the destructive write into the ConfirmModal's onConfirm callback;
    // the modal lives in ModalStack so close the dropdown first to keep the
    // visual focus on the dialog.
    close()
    pushModal({
      id: `reset-confirm-${Date.now()}`,
      kind: 'confirm',
      props: {
        titleKey: 'menu:app.reset',
        messageKey: 'menu:app.resetConfirm',
        danger: true,
        onConfirm: () => {
          useDiagramStore.setState({ diagram: emptyDiagram() })
          useDiagramStore.temporal.getState().clear()
          pushToast({
            id: `reset-${Date.now()}`,
            kind: 'success',
            messageKey: 'menu:app.resetDone',
          })
        },
      },
    })
  }

  // Hide entire menu chrome under embed (iframe/Moodle host provides its own UI).
  if (embed) return null

  // File actions vanish entirely under exam mode. Hiding rather than
  // disabling is the honest lockdown — a disabled attribute on a button is
  // one devtools flick away from being re-enabled and clicked. The Reset,
  // Shortcuts, and Theme controls stay live because they're UX, not data.
  //
  // Save / Export are additionally UX-disabled when the canvas is empty —
  // there's nothing to write to disk. Open stays enabled so the user can
  // load a file into the empty canvas.
  const fileActions: readonly FileAction[] = examMode
    ? []
    : [
        { id: 'open', labelKey: 'menu:file.open', icon: Upload, shortcut: 'Ctrl+O',
          onSelect: () => { void fileActionsHook.open() } },
        { id: 'save', labelKey: 'menu:file.save', icon: Download, shortcut: 'Ctrl+S',
          disabled: isCanvasEmpty,
          onSelect: () => { void fileActionsHook.save() } },
        { id: 'exportPng', labelKey: 'menu:file.exportPng', icon: ImageIcon,
          disabled: isCanvasEmpty,
          onSelect: () => { void exportPng() } },
        { id: 'exportSvg', labelKey: 'menu:file.exportSvg', icon: ImageIcon,
          disabled: isCanvasEmpty,
          onSelect: () => { void exportSvg() } },
        { id: 'exportMermaid', labelKey: 'menu:file.exportMermaid', icon: ImageIcon,
          disabled: isCanvasEmpty,
          onSelect: () => { void fileActionsHook.exportMermaid() } },
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
