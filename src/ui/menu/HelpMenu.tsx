import { useTranslation } from 'react-i18next'
import { nanoid } from 'nanoid'
import { MenuItem } from './MenuItem'
import { useUiStore } from '@/state/uiStore'

export interface HelpMenuProps {
  readonly isOpen: boolean
  readonly onOpen: () => void
  readonly onClose: () => void
}

export const HelpMenu = ({ isOpen, onOpen, onClose }: HelpMenuProps) => {
  const { t } = useTranslation('menu')
  const pushModal = useUiStore((s) => s.pushModal)
  const openCheatsheet = () => {
    pushModal({ id: nanoid(), kind: 'cheatsheet', props: {} })
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
        {t('help.title')}
      </button>
      {isOpen && (
        <ul role="menu" className="absolute right-0 top-full z-30 mt-1 min-w-[220px] rounded border border-slate-200 bg-white py-1 shadow-lg">
          <li><MenuItem label={t('help.cheatsheet')} shortcut="?" onSelect={openCheatsheet} /></li>
        </ul>
      )}
    </div>
  )
}
