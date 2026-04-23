import { ERCanvas } from './canvas/ERCanvas'
import { AppShell } from './ui/app/AppShell'
import { MenuBar } from './ui/menu/MenuBar'
import { Toolbar } from './ui/toolbar/Toolbar'
import { PropertyPanel } from './ui/properties/PropertyPanel'
import { ToastStack } from './ui/overlays/ToastStack'
import { ModalStack } from './ui/overlays/ModalStack'
import { ContextMenu } from './ui/overlays/ContextMenu'

export const App = () => (
  <AppShell
    menuBar={<MenuBar />}
    toolbar={<Toolbar />}
    canvas={<ERCanvas />}
    properties={<PropertyPanel />}
    overlays={
      <>
        <ToastStack />
        <ModalStack />
        <ContextMenu />
      </>
    }
  />
)
