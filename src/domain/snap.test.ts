import { describe, it, expect } from 'vitest'
import { snap, type SnapOptions } from './snap'

const defaultOpts: SnapOptions = {
  gridSize: 10,
  gridEnabled: false,
  alignmentThreshold: 4,
  alignmentEnabled: true,
}

const node = (x: number, y: number, w = 100, h = 50) => ({
  position: { x, y },
  size: { width: w, height: h },
})

describe('snap — grid', () => {
  it('off: returns identity position and empty guides', () => {
    const r = snap(node(3, 7), [], { ...defaultOpts, alignmentEnabled: false })
    expect(r.position).toEqual({ x: 3, y: 7 })
    expect(r.guides).toEqual([])
  })

  it('on: snaps position to nearest grid multiple', () => {
    const r = snap(node(7, 12), [], { ...defaultOpts, gridEnabled: true, alignmentEnabled: false })
    expect(r.position).toEqual({ x: 10, y: 10 })
  })

  it('on: snaps negative coordinates', () => {
    const r = snap(node(-13, -27), [], { ...defaultOpts, gridEnabled: true, alignmentEnabled: false })
    expect(r.position).toEqual({ x: -10, y: -30 })
  })
})

describe('snap — alignment guides', () => {
  it('centre-x alignment within threshold emits a vertical guide and snaps x', () => {
    const dragged = node(98, 0) // centre_x = 148
    const other = node(100, 200) // centre_x = 150
    const r = snap(dragged, [other], { ...defaultOpts, alignmentThreshold: 4 })
    expect(r.position.x).toBe(100) // snapped so centre_x = 150
    expect(r.guides.some((g) => g.orientation === 'vertical')).toBe(true)
  })

  it('alignment outside threshold does not snap', () => {
    const dragged = node(0, 0)
    const other = node(50, 200)
    const r = snap(dragged, [other], { ...defaultOpts, alignmentThreshold: 4 })
    expect(r.position).toEqual({ x: 0, y: 0 })
    expect(r.guides).toEqual([])
  })

  it('centre-y alignment within threshold emits a horizontal guide and snaps y', () => {
    const dragged = node(0, 98)
    const other = node(400, 100)
    const r = snap(dragged, [other], { ...defaultOpts, alignmentThreshold: 4 })
    expect(r.position.y).toBe(100)
    expect(r.guides.some((g) => g.orientation === 'horizontal')).toBe(true)
  })

  it('disabled alignment returns identity with no guides', () => {
    const r = snap(node(98, 0), [node(100, 200)], { ...defaultOpts, alignmentEnabled: false })
    expect(r.position).toEqual({ x: 98, y: 0 })
    expect(r.guides).toEqual([])
  })

  it('grid + alignment: alignment wins for axes where both would snap to different values', () => {
    const dragged = node(8, 50)
    const other = node(10, 200)
    const r = snap(dragged, [other], { ...defaultOpts, gridEnabled: true, alignmentThreshold: 4 })
    expect(r.position.x).toBe(10)
  })

  it('guide lines span the min-to-max y (for vertical guides) of the aligning nodes', () => {
    const dragged = node(98, 500)
    const other = node(100, 100)
    const r = snap(dragged, [other], defaultOpts)
    const v = r.guides.find((g) => g.orientation === 'vertical')
    expect(v).toBeDefined()
    expect(v!.from.y).toBeLessThanOrEqual(v!.to.y)
  })
})
