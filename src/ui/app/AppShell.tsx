import type { ReactNode } from 'react'
import { useUiStore } from '@/state/uiStore'
import { useSelectionStore } from '@/state/selectionStore'

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
  return (
    <div className="relative flex h-screen w-screen bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <main className="flex flex-1 overflow-hidden">{canvas}</main>
      {showProperties && (
        <aside
          className="flex w-80 shrink-0 flex-col border-l border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
          data-role="properties-panel"
        >
          {properties}
        </aside>
      )}
      {chrome}
      {overlays}
    </div>
  )
}
