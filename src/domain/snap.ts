import type { Point, Size } from './types'

export interface SnapOptions {
  readonly gridSize: number
  readonly gridEnabled: boolean
  readonly alignmentThreshold: number
  readonly alignmentEnabled: boolean
}

export interface SnapGuide {
  readonly orientation: 'horizontal' | 'vertical'
  readonly position: number
  readonly from: Point
  readonly to: Point
}

export interface SnapSubject {
  readonly position: Point
  readonly size: Size
}

export interface SnapResult {
  readonly position: Point
  readonly guides: readonly SnapGuide[]
}

const snapToGrid = (n: number, step: number): number => Math.round(n / step) * step

export const snap = (
  dragged: SnapSubject,
  others: readonly SnapSubject[],
  opts: SnapOptions,
): SnapResult => {
  let x = dragged.position.x
  let y = dragged.position.y

  const guides: SnapGuide[] = []
  if (opts.alignmentEnabled) {
    const draggedCx = x + dragged.size.width / 2
    const draggedCy = y + dragged.size.height / 2

    let bestVertical: { otherCx: number; other: SnapSubject } | null = null
    let bestHorizontal: { otherCy: number; other: SnapSubject } | null = null

    for (const o of others) {
      const oCx = o.position.x + o.size.width / 2
      const oCy = o.position.y + o.size.height / 2
      if (bestVertical === null && Math.abs(oCx - draggedCx) <= opts.alignmentThreshold) {
        bestVertical = { otherCx: oCx, other: o }
      }
      if (bestHorizontal === null && Math.abs(oCy - draggedCy) <= opts.alignmentThreshold) {
        bestHorizontal = { otherCy: oCy, other: o }
      }
    }

    if (bestVertical) {
      x = bestVertical.otherCx - dragged.size.width / 2
      const oy = bestVertical.other.position.y
      const oh = bestVertical.other.size.height
      const dy1 = y
      const dy2 = y + dragged.size.height
      guides.push({
        orientation: 'vertical',
        position: bestVertical.otherCx,
        from: { x: bestVertical.otherCx, y: Math.min(dy1, oy) },
        to: { x: bestVertical.otherCx, y: Math.max(dy2, oy + oh) },
      })
    }
    if (bestHorizontal) {
      y = bestHorizontal.otherCy - dragged.size.height / 2
      const ox = bestHorizontal.other.position.x
      const ow = bestHorizontal.other.size.width
      const dx1 = x
      const dx2 = x + dragged.size.width
      guides.push({
        orientation: 'horizontal',
        position: bestHorizontal.otherCy,
        from: { x: Math.min(dx1, ox), y: bestHorizontal.otherCy },
        to: { x: Math.max(dx2, ox + ow), y: bestHorizontal.otherCy },
      })
    }
  }

  if (opts.gridEnabled) {
    x = snapToGrid(x, opts.gridSize)
    y = snapToGrid(y, opts.gridSize)
  }

  return { position: { x, y }, guides }
}
