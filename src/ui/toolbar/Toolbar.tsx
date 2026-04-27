import { memo } from 'react'
import type { DragEvent as ReactDragEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from 'zustand'
import { Undo2, Redo2, Trash2, ChevronRight, ChevronLeft } from 'lucide-react'
import { ToolButton } from './ToolButton'
import { writeToolToDataTransfer } from './dragFromToolbar'
import { useInteractionStore } from '@/interaction/interactionStore'
import { useDiagramStore } from '@/state/diagramStore'
import { useSelectionStore } from '@/state/selectionStore'
import { useUiStore } from '@/state/uiStore'
import { IconButton } from '@/ui/primitives'
import type { Tool } from '@/interaction/events'
import type { ToolbarGroup } from '@/notation/types'
import { chenPlugin } from '@/notation/chen'
import { ICONS } from './icons'
import { usePanelMode } from '@/ui/app/usePanelMode'

// Only element tools are drag-placeable onto the canvas.
const DRAG_TOOLS = new Set(['entity', 'relationship', 'attribute', 'isa'])
const ICON_SIZE = 18

// In readonly mode only the viewport/selection tools remain visible.
const SELECT_ONLY = new Set(['select', 'pan'])

// max-h leaves ~12rem (192px) at the bottom of the viewport so the React
// Flow zoom/fit controls (bottom-left by default) stay reachable. If the
// rail content exceeds this height (touch buttons stack to ~44px each on
// mobile), the rail scrolls vertically inside its own bounds.
const NAV_VERTICAL =
  'fixed left-2 top-16 z-40 flex max-h-[calc(100dvh-12rem)] w-12 flex-col items-center gap-1 overflow-y-auto rounded-lg border border-slate-200 bg-white/90 px-1 py-2 text-slate-700 shadow-lg backdrop-blur-md sm:top-4 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-200'
const NAV_HORIZONTAL =
  'fixed left-1/2 top-4 z-40 flex h-12 max-w-[calc(100vw-1rem)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-white/90 px-3 text-slate-700 shadow-lg backdrop-blur-md dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-200'
const GROUP_VERTICAL =
  'mb-2 flex flex-col items-center gap-0.5 border-b border-slate-200 pb-2 dark:border-slate-700'
const GROUP_HORIZONTAL =
  'mr-2 flex items-center gap-0.5 border-r border-slate-200 pr-2 dark:border-slate-700'

interface RailProps {
  readonly isVertical: boolean
  readonly isMobile: boolean
  readonly visibleGroups: readonly ToolbarGroup[]
  readonly currentTool: Tool
  readonly canUndo: boolean
  readonly canRedo: boolean
  readonly readonly: boolean
  readonly selectionCount: number
  readonly onPick: (toolId: string) => void
  readonly onDragStart: (toolId: string, e: ReactDragEvent<HTMLDivElement>) => void
  readonly onCollapse: () => void
  readonly onUndo: () => void
  readonly onRedo: () => void
  readonly onDelete: () => void
}

const ToolbarRail = ({
  isVertical, isMobile, visibleGroups, currentTool, canUndo, canRedo, readonly,
  selectionCount, onPick, onDragStart, onCollapse, onUndo, onRedo, onDelete,
}: RailProps) => {
  const { t } = useTranslation(['toolbar', 'menu'])
  const groupClassName = isVertical ? GROUP_VERTICAL : GROUP_HORIZONTAL
  const deleteGroupClassName = isVertical ? 'flex flex-col items-center gap-0.5' : 'flex items-center gap-0.5'
  return (
    <nav
      aria-label={t('toolbar:group.elements')}
      data-role="toolbar"
      data-orientation={isVertical ? 'vertical' : 'horizontal'}
      className={isVertical ? NAV_VERTICAL : NAV_HORIZONTAL}
    >
      {isMobile && (
        <IconButton
          aria-label={t('toolbar:collapse')}
          title={t('toolbar:collapse')}
          icon={<ChevronLeft size={ICON_SIZE} aria-hidden />}
          onClick={onCollapse}
        />
      )}
      {visibleGroups.map((group) => (
        <div key={group.id} data-role="toolbar-group" data-group-id={group.id} className={groupClassName}>
          {group.tools.map((toolId) => (
            <ToolButton
              key={toolId}
              toolId={toolId}
              labelKey={`toolbar:tool.${toolId}`}
              icon={ICONS[toolId] ?? '?'}
              isActive={currentTool === toolId}
              onPick={onPick}
              onDragStart={DRAG_TOOLS.has(toolId) ? onDragStart : undefined}
            />
          ))}
        </div>
      ))}
      <div data-role="toolbar-group" data-group-id="history" className={groupClassName}>
        <IconButton
          aria-label={t('menu:edit.undo')}
          title={`${t('menu:edit.undo')} (Ctrl+Z)`}
          icon={<Undo2 size={ICON_SIZE} aria-hidden />}
          disabled={!canUndo || readonly}
          onClick={onUndo}
        />
        <IconButton
          aria-label={t('menu:edit.redo')}
          title={`${t('menu:edit.redo')} (Ctrl+Shift+Z)`}
          icon={<Redo2 size={ICON_SIZE} aria-hidden />}
          disabled={!canRedo || readonly}
          onClick={onRedo}
        />
      </div>
      {selectionCount > 0 && !readonly && (
        <div data-role="toolbar-group" data-group-id="delete" className={deleteGroupClassName}>
          <IconButton
            aria-label={t('menu:edit.delete')}
            title={`${t('menu:edit.delete')} (${selectionCount})`}
            icon={<Trash2 size={ICON_SIZE} aria-hidden />}
            onClick={onDelete}
            className="text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30"
          />
        </div>
      )}
    </nav>
  )
}

export const Toolbar = memo(() => {
  const { t } = useTranslation(['toolbar'])
  const currentTool = useInteractionStore((s) => s.snapshot.context.tool)
  const readonly = useUiStore((s) => s.readonly)
  const embed = useUiStore((s) => s.embed)
  // panels.toolbar: persisted open/closed state for the mobile rail. Undefined
  // (default) → closed, so first paint on a phone shows a clean canvas.
  const toolbarOpen = useUiStore((s) => !!s.panels.toolbar)
  const togglePanel = useUiStore((s) => s.togglePanel)
  const mode = usePanelMode()

  const canUndo = useStore(useDiagramStore.temporal, (s) => s.pastStates.length > 0)
  const canRedo = useStore(useDiagramStore.temporal, (s) => s.futureStates.length > 0)
  const selectionCount = useSelectionStore(
    (s) => s.selectedNodeIds.size + s.selectedEdgeIds.size,
  )

  const send = useInteractionStore.getState().send

  if (embed) return null

  const visibleGroups = readonly
    ? chenPlugin.tools.groups
        .map((g) => ({ ...g, tools: g.tools.filter((id) => SELECT_ONLY.has(id)) }))
        .filter((g) => g.tools.length > 0)
    : chenPlugin.tools.groups

  const isMobile = mode === 'mobile'
  const isVertical = mode !== 'desktop'
  // Mobile: rail visible only when explicitly opened. Tablet/desktop: always.
  const showRail = !isMobile || toolbarOpen

  const handlePick = (toolId: string): void => {
    send({ type: 'PICK_TOOL', tool: toolId as Tool })
    // Auto-collapse on mobile so the user can immediately use the tool
    // without the rail covering the canvas.
    if (isMobile && toolbarOpen) togglePanel('toolbar')
  }

  // Mobile collapsed: render only the chevron at the rail's would-be top.
  if (isMobile && !showRail) {
    return (
      <div className="fixed left-2 top-16 z-40" data-role="toolbar-toggle">
        <IconButton
          aria-label={t('toolbar:expand')}
          title={t('toolbar:expand')}
          icon={<ChevronRight size={ICON_SIZE} aria-hidden />}
          onClick={() => togglePanel('toolbar')}
          className="border border-slate-200 bg-white/90 shadow-lg backdrop-blur-md dark:border-slate-700 dark:bg-slate-800/90"
        />
      </div>
    )
  }

  return (
    <ToolbarRail
      isVertical={isVertical}
      isMobile={isMobile}
      visibleGroups={visibleGroups}
      currentTool={currentTool}
      canUndo={canUndo}
      canRedo={canRedo}
      readonly={readonly}
      selectionCount={selectionCount}
      onPick={handlePick}
      onDragStart={(toolId, e) => writeToolToDataTransfer(e, toolId)}
      onCollapse={() => togglePanel('toolbar')}
      onUndo={() => send({ type: 'UNDO' })}
      onRedo={() => send({ type: 'REDO' })}
      onDelete={() => send({ type: 'DELETE' })}
    />
  )
})
Toolbar.displayName = 'Toolbar'
