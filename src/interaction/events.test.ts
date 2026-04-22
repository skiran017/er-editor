import { describe, it, expect, expectTypeOf } from 'vitest'
import { NO_MODIFIERS, type EditorEvent, type Tool, type Modifiers, type PointerButton, type ResizeHandle } from './events'

describe('NO_MODIFIERS', () => {
  it('is all-false and frozen', () => {
    expect(NO_MODIFIERS).toEqual({ shift: false, ctrl: false, alt: false, meta: false })
    expect(Object.isFrozen(NO_MODIFIERS)).toBe(true)
  })
})

describe('EditorEvent discriminated union', () => {
  it('PICK_TOOL narrows tool field', () => {
    const e: EditorEvent = { type: 'PICK_TOOL', tool: 'entity' }
    if (e.type === 'PICK_TOOL') {
      expectTypeOf(e.tool).toEqualTypeOf<Tool>()
    }
  })

  it('CANVAS_POINTER_DOWN carries button and modifiers', () => {
    const e: EditorEvent = {
      type: 'CANVAS_POINTER_DOWN',
      point: { x: 0, y: 0 },
      modifiers: NO_MODIFIERS,
      button: 'left',
    }
    if (e.type === 'CANVAS_POINTER_DOWN') {
      expectTypeOf(e.button).toEqualTypeOf<PointerButton>()
      expectTypeOf(e.modifiers).toEqualTypeOf<Modifiers>()
    }
  })

  it('RESIZE_HANDLE_POINTER_DOWN carries a ResizeHandle', () => {
    const e: EditorEvent = {
      type: 'RESIZE_HANDLE_POINTER_DOWN',
      nodeId: 'x' as never,
      handle: 'se',
      point: { x: 0, y: 0 },
    }
    if (e.type === 'RESIZE_HANDLE_POINTER_DOWN') {
      expectTypeOf(e.handle).toEqualTypeOf<ResizeHandle>()
    }
  })
})
