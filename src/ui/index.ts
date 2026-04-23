export { AppShell } from './app/AppShell'
export { Menu } from './menu/Menu'
export { Toolbar } from './toolbar/Toolbar'
export { PropertyPanel } from './properties/PropertyPanel'
export { ToastStack } from './overlays/ToastStack'
export { ModalStack } from './overlays/ModalStack'
export { ContextMenu } from './overlays/ContextMenu'
// Note: useInlineRename lives in src/canvas/hooks/ (not src/ui/hooks/) because
// InlineRenameOverlay consumes it and `canvas → ui` is forbidden by ESLint.
// UI callers go through uiStore.startInlineRename directly.
