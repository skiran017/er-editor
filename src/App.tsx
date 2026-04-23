import { ERCanvas } from './canvas/ERCanvas'
import { AppShell } from './ui/app/AppShell'
import { Menu } from './ui/menu/Menu'
import { Toolbar } from './ui/toolbar/Toolbar'
import { PropertyPanel } from './ui/properties/PropertyPanel'
import { ToastStack } from './ui/overlays/ToastStack'
import { ModalStack } from './ui/overlays/ModalStack'
import { ContextMenu } from './ui/overlays/ContextMenu'

export const App = () => (
  <AppShell
    canvas={<ERCanvas />}
    properties={<PropertyPanel />}
    chrome={
      <>
        <Menu />
        <Toolbar />
      </>
    }
    overlays={
      <>
        <ToastStack />
        <ModalStack />
        <ContextMenu />
      </>
    }
  />
)
