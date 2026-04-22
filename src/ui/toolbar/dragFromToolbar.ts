import type { DragEvent } from 'react'

export const TOOL_MIME = 'application/x-er-tool'

export const writeToolToDataTransfer = (e: DragEvent<HTMLElement>, toolId: string): void => {
  e.dataTransfer.effectAllowed = 'copy'
  e.dataTransfer.setData(TOOL_MIME, toolId)
}

export const readToolFromDataTransfer = (e: DragEvent<HTMLElement>): string | null => {
  const v = e.dataTransfer.getData(TOOL_MIME)
  return v || null
}
