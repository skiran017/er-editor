import type { DragEvent as ReactDragEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { IconButton } from '@/ui/primitives'

export interface ToolButtonProps {
  readonly toolId: string
  readonly labelKey: string
  readonly icon: ReactNode
  readonly isActive: boolean
  readonly onPick: (toolId: string) => void
  readonly onDragStart?: (toolId: string, e: ReactDragEvent<HTMLDivElement>) => void
}

export const ToolButton = ({
  toolId,
  labelKey,
  icon,
  isActive,
  onPick,
  onDragStart,
}: ToolButtonProps) => {
  const { t } = useTranslation('toolbar')
  const label = t(labelKey)
  return (
    <div
      draggable={!!onDragStart}
      onDragStart={onDragStart ? (e) => onDragStart(toolId, e) : undefined}
      data-tool-id={toolId}
    >
      <IconButton
        aria-label={label}
        title={label}
        active={isActive}
        icon={icon}
        onClick={() => onPick(toolId)}
      />
    </div>
  )
}
