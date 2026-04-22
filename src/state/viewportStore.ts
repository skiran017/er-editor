import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { clamp } from '@/domain/geometry'
import type { Point, BBox, Size } from '@/domain/types'

const MIN_ZOOM = 0.1
const MAX_ZOOM = 4

export interface ViewportState {
  readonly zoom: number
  readonly pan: Point
  setViewport: (v: { zoom: number; pan: Point }) => void
  zoomAt: (anchor: Point, delta: number) => void
  fit: (bbox: BBox, viewport: Size, padding?: number) => void
}

export const useViewportStore = create<ViewportState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      zoom: 1,
      pan: { x: 0, y: 0 },

      setViewport: ({ zoom, pan }) => {
        const z = clamp(zoom, MIN_ZOOM, MAX_ZOOM)
        set((state) => {
          state.zoom = z
          state.pan = pan
        })
      },

      zoomAt: (anchor, delta) => {
        const { zoom, pan } = get()
        const nextZoom = clamp(zoom + delta, MIN_ZOOM, MAX_ZOOM)
        if (nextZoom === zoom) return
        // World point under anchor before zoom
        const world = { x: (anchor.x - pan.x) / zoom, y: (anchor.y - pan.y) / zoom }
        // After zoom, adjust pan so `anchor` still maps to `world`
        const nextPan: Point = {
          x: anchor.x - world.x * nextZoom,
          y: anchor.y - world.y * nextZoom,
        }
        set((state) => {
          state.zoom = nextZoom
          state.pan = nextPan
        })
      },

      fit: (bbox, viewport, padding = 0) => {
        const availW = Math.max(1, viewport.width - 2 * padding)
        const availH = Math.max(1, viewport.height - 2 * padding)
        const scaleX = availW / Math.max(1, bbox.width)
        const scaleY = availH / Math.max(1, bbox.height)
        const zoom = clamp(Math.min(scaleX, scaleY), MIN_ZOOM, MAX_ZOOM)
        const worldCenterX = bbox.x + bbox.width / 2
        const worldCenterY = bbox.y + bbox.height / 2
        const pan: Point = {
          x: viewport.width / 2 - worldCenterX * zoom,
          y: viewport.height / 2 - worldCenterY * zoom,
        }
        set((state) => {
          state.zoom = zoom
          state.pan = pan
        })
      },
    })),
  ),
)
