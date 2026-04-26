import type { ReactNode } from 'react'
import { useUiStore } from '@/state/uiStore'
import { useSelectionStore } from '@/state/selectionStore'
import { usePanelMode } from './usePanelMode'
import { PropertyDrawer } from './PropertyDrawer'

const closeDrawer = (): void => {
  // The drawer is gated on `hasSelection`; deselecting closes it without
  // touching the persisted `panels.properties` toggle. Flipping that toggle
  // here was a bug — it would survive reloads and silently disable the
  // property panel on every screen size until the user manually flipped it
  // back via the menu.
  useSelectionStore.getState().clear()
}

export interface AppShellProps {
  readonly canvas: ReactNode
  readonly properties: ReactNode
  // Floating chrome (hamburger menu + toolbar) stacked on top of the canvas.
  // Self-positions via fixed coordinates — AppShell just hosts the tree.
  readonly chrome?: ReactNode
  // Overlays slot (toasts, modals, context menu, inline-rename). Rendered
  // above chrome so modals dim the entire viewport including the toolbar.
  readonly overlays?: ReactNode
}

export const AppShell = ({ canvas, properties, chrome, overlays }: AppShellProps) => {
  const panelToggled = useUiStore((s) => s.panels.properties !== false)
  const hasSelection = useSelectionStore(
    (s) => s.selectedNodeIds.size + s.selectedEdgeIds.size > 0,
  )
  const showProperties = panelToggled && hasSelection
  const mode = usePanelMode()
  return (
    <div className="relative flex h-screen w-screen bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <main className="flex flex-1 overflow-hidden">{canvas}</main>
      {mode === 'desktop' && showProperties && (
        <aside
          className="flex w-80 shrink-0 flex-col border-l border-slate-200 bg-white 2xl:w-96 dark:border-slate-700 dark:bg-slate-800"
          data-role="properties-panel"
        >
          {properties}
        </aside>
      )}
      {mode !== 'desktop' && (
        <PropertyDrawer mode={mode} open={showProperties} onClose={closeDrawer}>
          {properties}
        </PropertyDrawer>
      )}
      {chrome}
      {overlays}
    </div>
  )
}
