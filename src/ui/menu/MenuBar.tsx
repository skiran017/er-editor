import { useCallback, useState } from 'react'
import { FileMenu } from './FileMenu'
import { EditMenu } from './EditMenu'
import { ViewMenu } from './ViewMenu'
import { HelpMenu } from './HelpMenu'

type OpenMenu = 'file' | 'edit' | 'view' | 'help' | null

export const MenuBar = () => {
  const [open, setOpen] = useState<OpenMenu>(null)
  const close = useCallback(() => setOpen(null), [])

  return (
    <nav role="menubar" aria-label="Main menu" className="flex h-full items-center gap-1 px-2 text-sm">
      <FileMenu isOpen={open === 'file'} onOpen={() => setOpen('file')} onClose={close} />
      <EditMenu isOpen={open === 'edit'} onOpen={() => setOpen('edit')} onClose={close} />
      <ViewMenu isOpen={open === 'view'} onOpen={() => setOpen('view')} onClose={close} />
      <HelpMenu isOpen={open === 'help'} onOpen={() => setOpen('help')} onClose={close} />
    </nav>
  )
}
