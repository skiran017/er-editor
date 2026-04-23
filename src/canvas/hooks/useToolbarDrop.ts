import { useCallback, type DragEvent as ReactDragEvent } from 'react'
import { useInteractionStore } from '@/interaction/interactionStore'
import { NO_MODIFIERS, type Tool } from '@/interaction/events'
import { readToolFromDataTransfer } from '@/domain/dragMime'

export interface ToolbarDropHandlers {
  readonly onDragOver: (e: ReactDragEvent<HTMLDivElement>) => void
  readonly onDrop: (e: ReactDragEvent<HTMLDivElement>) => void
}

/**
 * Drop target wiring for drag-from-toolbar payloads. The toolbar marks
 * element tools (entity/relationship/attribute/isa) as draggable and writes
 * the tool id into the `application/x-er-tool` MIME slot; this hook reads it
 * back on drop and replays `PICK_TOOL` → `CANVAS_POINTER_DOWN` →
 * `CANVAS_POINTER_UP` so the FSM's placing state handles the node creation
 * through the same `placeNodeAction` used for click-to-place.
 */
export const useToolbarDrop = (): ToolbarDropHandlers => {
  const onDragOver = useCallback((e: ReactDragEvent<HTMLDivElement>) => {
    // preventDefault on dragover is the browser's "drop OK" signal. We do it
    // unconditionally here — handleDrop early-returns if the MIME is absent.
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const onDrop = useCallback((e: ReactDragEvent<HTMLDivElement>) => {
    const toolId = readToolFromDataTransfer(e)
    if (!toolId) return
    e.preventDefault()

    const send = useInteractionStore.getState().send
    // Drop point comes in client coords. The FSM's placing states don't
    // currently rebase onto viewport — matches how CANVAS_POINTER_UP is
    // already dispatched from useMouse.
    const point = { x: e.clientX, y: e.clientY }
    send({ type: 'PICK_TOOL', tool: toolId as Tool })
    send({ type: 'CANVAS_POINTER_DOWN', point, modifiers: NO_MODIFIERS, button: 'left' })
    send({ type: 'CANVAS_POINTER_UP', point })
  }, [])

  return { onDragOver, onDrop }
}
