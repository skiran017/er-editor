import { useSelectionStore } from '@/state/selectionStore'
import { useViewportStore } from '@/state/viewportStore'

// Min drag in screen pixels before we draw the marquee. A bare click
// (mousedown → mouseup without moving) would otherwise flash a 0-px
// rectangle for one frame. Matches the typical drag-threshold feel.
const MIN_SCREEN_SIZE = 1

/**
 * Blue dashed marquee that tracks the selection drag. Subscribes to the
 * `rubberband` field on the selection store, converts the world-space
 * origin/current to screen coords, and renders an SVG rect above the canvas.
 * pointer-events: none so the canvas below still receives the drag events
 * that are driving the selection.
 */
export const RubberbandOverlay = () => {
  const rubberband = useSelectionStore((s) => s.rubberband)
  const zoom = useViewportStore((s) => s.zoom)
  const pan = useViewportStore((s) => s.pan)

  if (!rubberband) return null

  const { origin, current } = rubberband
  const wx = Math.min(origin.x, current.x)
  const wy = Math.min(origin.y, current.y)
  const ww = Math.abs(current.x - origin.x)
  const wh = Math.abs(current.y - origin.y)

  // World → screen: pan is in screen-space pixels, zoom is a scalar.
  const sx = wx * zoom + pan.x
  const sy = wy * zoom + pan.y
  const sw = ww * zoom
  const sh = wh * zoom

  if (sw < MIN_SCREEN_SIZE && sh < MIN_SCREEN_SIZE) return null

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-20 h-full w-full"
      data-role="rubberband-overlay"
    >
      <rect
        x={sx}
        y={sy}
        width={sw}
        height={sh}
        // Inline colours with explicit alpha work on both light and dark
        // backgrounds without needing separate CSS variants.
        fill="rgba(59, 130, 246, 0.12)"
        stroke="rgba(59, 130, 246, 0.9)"
        strokeWidth={1}
        strokeDasharray="4 3"
      />
    </svg>
  )
}
