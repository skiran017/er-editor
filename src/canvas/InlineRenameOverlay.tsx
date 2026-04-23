import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useInlineRename } from '@/canvas/hooks/useInlineRename'
import { useDiagramStore } from '@/state/diagramStore'
import { useViewportStore } from '@/state/viewportStore'

export const InlineRenameOverlay = () => {
  const { active, commit, cancel } = useInlineRename()
  const diagram = useDiagramStore((s) => s.diagram)
  const zoom = useViewportStore((s) => s.zoom)
  const pan = useViewportStore((s) => s.pan)
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState(active?.initialValue ?? '')

  useEffect(() => {
    if (active) {
      setValue(active.initialValue)
      queueMicrotask(() => inputRef.current?.focus())
      queueMicrotask(() => inputRef.current?.select())
    }
  }, [active])

  if (!active) return null
  const node = diagram.nodesById[active.nodeId]
  if (!node) return null

  const screenX = node.position.x * zoom + pan.x
  const screenY = node.position.y * zoom + pan.y
  const width = node.size.width * zoom
  const height = node.size.height * zoom

  const onKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); commit(value) }
    else if (e.key === 'Escape') { e.preventDefault(); cancel() }
  }

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={onKey}
      onBlur={() => commit(value)}
      className="absolute z-30 rounded border-2 border-blue-500 bg-white px-1 text-sm text-slate-900 outline-none dark:bg-slate-800 dark:text-slate-100"
      style={{ left: screenX, top: screenY, width, height }}
      data-role="inline-rename"
      aria-label="Rename element"
    />
  )
}
