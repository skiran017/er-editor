import { useTranslation } from 'react-i18next'
import { MenuItem } from './MenuItem'
import { useInteractionStore } from '@/interaction/interactionStore'
import type { EditorEvent } from '@/interaction/events'

export interface EditMenuProps {
  readonly isOpen: boolean
  readonly onOpen: () => void
  readonly onClose: () => void
}

const dispatch = (e: EditorEvent): void => {
  useInteractionStore.getState().send(e)
}

export const EditMenu = ({ isOpen, onOpen, onClose }: EditMenuProps) => {
  const { t } = useTranslation('menu')
  const go = (e: EditorEvent) => () => { dispatch(e); onClose() }
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
        {t('edit.title')}
      </button>
      {isOpen && (
        <ul role="menu" className="absolute left-0 top-full z-30 mt-1 min-w-[220px] rounded border border-slate-200 bg-white py-1 shadow-lg">
          <li><MenuItem label={t('edit.undo')} shortcut="Ctrl+Z" onSelect={go({ type: 'UNDO' })} /></li>
          <li><MenuItem label={t('edit.redo')} shortcut="Ctrl+Shift+Z" onSelect={go({ type: 'REDO' })} /></li>
          <li><MenuItem label={t('edit.cut')} shortcut="Ctrl+X" onSelect={go({ type: 'CUT' })} /></li>
          <li><MenuItem label={t('edit.copy')} shortcut="Ctrl+C" onSelect={go({ type: 'COPY' })} /></li>
          <li><MenuItem label={t('edit.paste')} shortcut="Ctrl+V" onSelect={go({ type: 'PASTE' })} /></li>
          <li><MenuItem label={t('edit.duplicate')} shortcut="Ctrl+D" onSelect={go({ type: 'DUPLICATE' })} /></li>
          <li><MenuItem label={t('edit.delete')} shortcut="Del" onSelect={go({ type: 'DELETE' })} danger /></li>
          <li><MenuItem label={t('edit.selectAll')} shortcut="Ctrl+A" onSelect={go({ type: 'SELECT_ALL' })} /></li>
          <li><MenuItem label={t('edit.invertSelection')} shortcut="Shift+Alt+A" onSelect={go({ type: 'INVERT_SELECTION' })} /></li>
        </ul>
      )}
    </div>
  )
}
