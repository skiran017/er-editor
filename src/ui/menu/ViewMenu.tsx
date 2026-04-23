import { useTranslation } from 'react-i18next'
import { MenuItem } from './MenuItem'
import { useInteractionStore } from '@/interaction/interactionStore'
import { useUiStore } from '@/state/uiStore'

export interface ViewMenuProps {
  readonly isOpen: boolean
  readonly onOpen: () => void
  readonly onClose: () => void
}

export const ViewMenu = ({ isOpen, onOpen, onClose }: ViewMenuProps) => {
  const { t } = useTranslation('menu')
  const snap = useUiStore((s) => s.snap)
  const setSnap = useUiStore((s) => s.setSnap)
  const togglePanel = useUiStore((s) => s.togglePanel)

  const close = (fn: () => void) => () => { fn(); onClose() }

  return (
    <div className="relative">
      <button
        type="button"
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={isOpen ? onClose : onOpen}
        className="rounded px-2 py-1 hover:bg-slate-100"
      >
        {t('view.title')}
      </button>
      {isOpen && (
        <ul role="menu" className="absolute left-0 top-full z-30 mt-1 min-w-[220px] rounded border border-slate-200 bg-white py-1 shadow-lg">
          <li><MenuItem label={t('view.zoomIn')} shortcut="Ctrl++" onSelect={close(() => useInteractionStore.getState().send({ type: 'ZOOM_IN' }))} /></li>
          <li><MenuItem label={t('view.zoomOut')} shortcut="Ctrl+-" onSelect={close(() => useInteractionStore.getState().send({ type: 'ZOOM_OUT' }))} /></li>
          <li><MenuItem label={t('view.fitView')} shortcut="Ctrl+0" onSelect={close(() => useInteractionStore.getState().send({ type: 'FIT' }))} /></li>
          <li><MenuItem
            label={`${t('view.grid')}${snap.gridEnabled ? ' ✓' : ''}`}
            onSelect={close(() => setSnap({ gridEnabled: !snap.gridEnabled }))}
          /></li>
          <li><MenuItem
            label={`${t('view.alignment')}${snap.alignmentEnabled ? ' ✓' : ''}`}
            onSelect={close(() => setSnap({ alignmentEnabled: !snap.alignmentEnabled }))}
          /></li>
          <li><MenuItem label={t('view.properties')} onSelect={close(() => togglePanel('properties'))} /></li>
        </ul>
      )}
    </div>
  )
}
