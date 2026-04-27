import { useEffect, useState, type ReactNode } from 'react'
import { useUiStore } from '@/state/uiStore'
import { useSelectionStore } from '@/state/selectionStore'
import { usePanelMode } from './usePanelMode'
import { PropertyDrawer } from './PropertyDrawer'

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
  // Subscribe to the actual Sets (not just sizes) so the drawer-dismissed
  // effect below fires whenever the SET reference changes — selection store
  // creates a new Set on every mutation, so even re-selecting the same node
  // produces a new reference.
  const selectedNodeIds = useSelectionStore((s) => s.selectedNodeIds)
  const selectedEdgeIds = useSelectionStore((s) => s.selectedEdgeIds)
  const hasSelection = selectedNodeIds.size + selectedEdgeIds.size > 0
  const showProperties = panelToggled && hasSelection
  const mode = usePanelMode()
  // On mobile / tablet the drawer covers the canvas, so the user needs a
  // way to dismiss it (e.g. after rubberband-selecting multiple nodes they
  // want to drag) WITHOUT losing the selection. Per-selection transient
  // flag: tapping the backdrop or close button hides the drawer for the
  // current selection set; a new selection (different ids OR re-tapping
  // anything — selectionStore always replaces the Set) reopens it.
  const [drawerDismissed, setDrawerDismissed] = useState(false)
  useEffect(() => {
    setDrawerDismissed(false)
  }, [selectedNodeIds, selectedEdgeIds])
  return (
    <div
      // h-dvh tracks the visible viewport, excluding mobile browser chrome
      // (Samsung Internet, mobile Safari address bars). h-screen (=100vh)
      // would include that chrome and push absolutely-positioned bottom
      // children — the React Flow zoom controls in particular — partially
      // off-screen.
      className="relative flex h-dvh w-screen bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100"
    >
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
        <PropertyDrawer
          mode={mode}
          open={showProperties && !drawerDismissed}
          onClose={() => setDrawerDismissed(true)}
        >
          {properties}
        </PropertyDrawer>
      )}
      {chrome}
      {overlays}
    </div>
  )
}
