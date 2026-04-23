import { useTranslation } from 'react-i18next'
import { MenuItem } from './MenuItem'
import { useUiStore } from '@/state/uiStore'
import { useDiagramStore } from '@/state/diagramStore'
import { emptyDiagram } from '@/domain/types'

export interface FileMenuProps {
  readonly isOpen: boolean
  readonly onOpen: () => void
  readonly onClose: () => void
}

export const FileMenu = ({ isOpen, onOpen, onClose }: FileMenuProps) => {
  const { t } = useTranslation('menu')
  const pushToast = useUiStore((s) => s.pushToast)

  const toastPhase5 = () => {
    pushToast({ id: `phase5-${Date.now()}`, kind: 'info', messageKey: 'menu:notYetAvailable' })
    onClose()
  }

  const handleNew = () => {
    useDiagramStore.setState({ diagram: emptyDiagram() })
    useDiagramStore.temporal.getState().clear()
    onClose()
  }

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
        {t('file.title')}
      </button>
      {isOpen && (
        <ul role="menu" className="absolute left-0 top-full z-30 mt-1 min-w-[220px] rounded border border-slate-200 bg-white py-1 shadow-lg">
          <li><MenuItem label={t('file.new')} onSelect={handleNew} /></li>
          <li><MenuItem label={t('file.open')} onSelect={toastPhase5} shortcut="Ctrl+O" /></li>
          <li><MenuItem label={t('file.save')} onSelect={toastPhase5} shortcut="Ctrl+S" /></li>
          <li><MenuItem label={t('file.exportPng')} onSelect={toastPhase5} /></li>
          <li><MenuItem label={t('file.exportSvg')} onSelect={toastPhase5} /></li>
          <li><MenuItem label={t('file.exportMermaid')} onSelect={toastPhase5} /></li>
        </ul>
      )}
    </div>
  )
}
