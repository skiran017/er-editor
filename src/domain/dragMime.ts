import type { DragEvent } from 'react'

// Shared MIME contract for drag-from-toolbar. Kept in domain/ so both the
// toolbar (ui/) and the canvas drop target (canvas/) can reference the same
// constant without crossing the canvas→ui layer line (spec §2.2).
export const TOOL_MIME = 'application/x-er-tool'

export const writeToolToDataTransfer = (e: DragEvent<HTMLElement>, toolId: string): void => {
  e.dataTransfer.effectAllowed = 'copy'
  e.dataTransfer.setData(TOOL_MIME, toolId)
}

export const readToolFromDataTransfer = (e: DragEvent<HTMLElement>): string | null => {
  const v = e.dataTransfer.getData(TOOL_MIME)
  return v || null
}
