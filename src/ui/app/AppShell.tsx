import type { ReactNode } from 'react'
import { useUiStore } from '@/state/uiStore'
import { useSelectionStore } from '@/state/selectionStore'

export interface AppShellProps {
  readonly menuBar: ReactNode
  readonly toolbar: ReactNode
  readonly canvas: ReactNode
  readonly properties: ReactNode
  readonly overlays?: ReactNode
}

export const AppShell = ({ menuBar, toolbar, canvas, properties, overlays }: AppShellProps) => {
  // Panel visibility rule: show only when something is selected AND the user
  // hasn't explicitly closed the panel. Closing the panel (X button inside)
  // clears the selection, so the panel stays hidden until the next select.
  const panelToggled = useUiStore((s) => s.panels.properties !== false)
  const hasSelection = useSelectionStore(
    (s) => s.selectedNodeIds.size + s.selectedEdgeIds.size > 0,
  )
  const showProperties = panelToggled && hasSelection
  return (
    <div className="relative flex h-screen w-screen flex-col bg-white text-slate-900">
      <div className="flex h-10 shrink-0 items-center border-b border-slate-200">{menuBar}</div>
      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-14 shrink-0 flex-col items-center border-r border-slate-200 py-2">
          {toolbar}
        </aside>
        <main className="flex flex-1 overflow-hidden">{canvas}</main>
        {showProperties && (
          <aside
            className="flex w-80 shrink-0 flex-col border-l border-slate-200"
            data-role="properties-panel"
          >
            {properties}
          </aside>
        )}
      </div>
      {overlays}
    </div>
  )
}
