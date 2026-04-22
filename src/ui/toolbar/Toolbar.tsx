import { memo } from 'react'
import type { DragEvent as ReactDragEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ToolButton } from './ToolButton'
import { writeToolToDataTransfer } from './dragFromToolbar'
import { useInteractionStore } from '@/interaction/interactionStore'
import type { Tool } from '@/interaction/events'
import { chenPlugin } from '@/notation/chen'

// Tiny inline icon glyphs. Swap for real icons later; the ToolButton contract
// is agnostic.
const ICONS: Record<string, string> = {
  select: '⬚', pan: '✋',
  entity: '▭', relationship: '◆', attribute: '◯', isa: '△',
  connect: '↔', quickRelationship: '▭◆▭', quickGeneralization: '△↓',
}

// Only element tools are drag-placeable onto the canvas.
const DRAG_TOOLS = new Set(['entity', 'relationship', 'attribute', 'isa'])

export const Toolbar = memo(() => {
  const { t } = useTranslation('toolbar')
  const currentTool = useInteractionStore((s) => s.snapshot.context.tool)

  const handlePick = (toolId: string): void => {
    useInteractionStore.getState().send({ type: 'PICK_TOOL', tool: toolId as Tool })
  }

  const handleDragStart = (toolId: string, e: ReactDragEvent<HTMLDivElement>): void => {
    writeToolToDataTransfer(e, toolId)
  }

  return (
    <nav aria-label={t('group.elements')} className="flex flex-col gap-1" data-role="toolbar">
      {chenPlugin.tools.groups.map((group) => (
        <div key={group.id} className="flex flex-col gap-1" data-role="toolbar-group" data-group-id={group.id}>
          {group.tools.map((toolId) => (
            <ToolButton
              key={toolId}
              toolId={toolId}
              labelKey={`tool.${toolId}`}
              icon={<span aria-hidden>{ICONS[toolId] ?? '?'}</span>}
              isActive={currentTool === toolId}
              onPick={handlePick}
              onDragStart={DRAG_TOOLS.has(toolId) ? handleDragStart : undefined}
            />
          ))}
        </div>
      ))}
    </nav>
  )
})
Toolbar.displayName = 'Toolbar'
