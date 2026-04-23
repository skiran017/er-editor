import { memo } from 'react'
import type { DragEvent as ReactDragEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from 'zustand'
import { Undo2, Redo2, Trash2 } from 'lucide-react'
import { ToolButton } from './ToolButton'
import { writeToolToDataTransfer } from './dragFromToolbar'
import { useInteractionStore } from '@/interaction/interactionStore'
import { useDiagramStore } from '@/state/diagramStore'
import { useSelectionStore } from '@/state/selectionStore'
import { IconButton } from '@/ui/primitives'
import type { Tool } from '@/interaction/events'
import { chenPlugin } from '@/notation/chen'
import { ICONS } from './icons'

// Only element tools are drag-placeable onto the canvas.
const DRAG_TOOLS = new Set(['entity', 'relationship', 'attribute', 'isa'])
const ICON_SIZE = 18

export const Toolbar = memo(() => {
  const { t } = useTranslation(['toolbar', 'menu'])
  const currentTool = useInteractionStore((s) => s.snapshot.context.tool)

  // zundo exposes `temporal` as a zustand store; subscribe via useStore so the
  // undo/redo buttons disable/enable reactively as history grows and shrinks.
  const canUndo = useStore(useDiagramStore.temporal, (s) => s.pastStates.length > 0)
  const canRedo = useStore(useDiagramStore.temporal, (s) => s.futureStates.length > 0)

  // Delete button appears only when SOMETHING is selected (node or edge).
  const selectionCount = useSelectionStore(
    (s) => s.selectedNodeIds.size + s.selectedEdgeIds.size,
  )

  const send = useInteractionStore.getState().send

  const handlePick = (toolId: string): void => {
    send({ type: 'PICK_TOOL', tool: toolId as Tool })
  }

  const handleDragStart = (toolId: string, e: ReactDragEvent<HTMLDivElement>): void => {
    writeToolToDataTransfer(e, toolId)
  }

  return (
    <nav
      aria-label={t('toolbar:group.elements')}
      data-role="toolbar"
      className="fixed left-1/2 top-4 z-40 flex h-12 -translate-x-1/2 items-center gap-1 rounded-lg border border-slate-200 bg-white/90 px-3 shadow-lg backdrop-blur-md"
    >
      {/* Element / tool groups from chenPlugin (select, elements, connections).
          Every group is followed by a separator (history group sits after). */}
      {chenPlugin.tools.groups.map((group) => (
        <div
          key={group.id}
          data-role="toolbar-group"
          data-group-id={group.id}
          className="mr-2 flex items-center gap-0.5 border-r border-slate-200 pr-2"
        >
          {group.tools.map((toolId) => (
            <ToolButton
              key={toolId}
              toolId={toolId}
              labelKey={`toolbar:tool.${toolId}`}
              icon={ICONS[toolId] ?? '?'}
              isActive={currentTool === toolId}
              onPick={handlePick}
              onDragStart={DRAG_TOOLS.has(toolId) ? handleDragStart : undefined}
            />
          ))}
        </div>
      ))}

      {/* History group — undo / redo dispatch through the FSM so keyboard
          shortcuts and the toolbar fire the same EditorEvents. */}
      <div
        data-role="toolbar-group"
        data-group-id="history"
        className="mr-2 flex items-center gap-0.5 border-r border-slate-200 pr-2"
      >
        <IconButton
          aria-label={t('menu:edit.undo')}
          title={`${t('menu:edit.undo')} (Ctrl+Z)`}
          icon={<Undo2 size={ICON_SIZE} aria-hidden />}
          disabled={!canUndo}
          onClick={() => send({ type: 'UNDO' })}
        />
        <IconButton
          aria-label={t('menu:edit.redo')}
          title={`${t('menu:edit.redo')} (Ctrl+Shift+Z)`}
          icon={<Redo2 size={ICON_SIZE} aria-hidden />}
          disabled={!canRedo}
          onClick={() => send({ type: 'REDO' })}
        />
      </div>

      {/* Delete — only renders when at least one node or edge is selected.
          Dispatches DELETE event so the machine can apply deletion semantics
          consistent with keyboard (Del / Backspace). */}
      {selectionCount > 0 && (
        <div data-role="toolbar-group" data-group-id="delete" className="flex items-center gap-0.5">
          <IconButton
            aria-label={t('menu:edit.delete')}
            title={`${t('menu:edit.delete')} (${selectionCount})`}
            icon={<Trash2 size={ICON_SIZE} aria-hidden />}
            onClick={() => send({ type: 'DELETE' })}
            className="text-red-600 hover:bg-red-100"
          />
        </div>
      )}
    </nav>
  )
})
Toolbar.displayName = 'Toolbar'
