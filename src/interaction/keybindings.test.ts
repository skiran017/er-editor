import { describe, it, expect } from 'vitest'
import { keybindings, matchKeybinding, normaliseKeyCombo } from './keybindings'

const makeEvent = (init: Partial<KeyboardEvent> = {}): KeyboardEvent =>
  new KeyboardEvent('keydown', {
    key: 'Z', ctrlKey: false, metaKey: false, shiftKey: false, altKey: false,
    ...init,
  })

describe('normaliseKeyCombo', () => {
  it('sorts modifiers canonically: Ctrl, Meta, Shift, Alt, Key', () => {
    const e = makeEvent({ key: 'z', ctrlKey: true, shiftKey: true })
    expect(normaliseKeyCombo(e)).toBe('Ctrl+Shift+Z')
  })
  it('normalises single-letter keys to uppercase', () => {
    expect(normaliseKeyCombo(makeEvent({ key: 'a' }))).toBe('A')
  })
  it('preserves non-letter keys: Escape / Space / Delete / ArrowUp', () => {
    expect(normaliseKeyCombo(makeEvent({ key: 'Escape' }))).toBe('Escape')
    expect(normaliseKeyCombo(makeEvent({ key: 'ArrowUp' }))).toBe('ArrowUp')
  })
})

describe('keybindings registry', () => {
  it('covers all tool keys from spec §7.2', () => {
    const ids = keybindings.map((k) => k.id)
    expect(ids).toEqual(expect.arrayContaining([
      'tool.select', 'tool.pan', 'tool.entity', 'tool.relationship',
      'tool.attribute', 'tool.isa', 'tool.connect',
    ]))
  })
  it('every binding has non-empty keys and at least one i18n key', () => {
    for (const kb of keybindings) {
      expect(kb.keys.length).toBeGreaterThan(0)
      expect(kb.descriptionKey.length).toBeGreaterThan(0)
    }
  })
  it('ids are unique', () => {
    const ids = keybindings.map((k) => k.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('matchKeybinding', () => {
  it('matches Cmd+Z to undo on macOS-style input', () => {
    const m = matchKeybinding(makeEvent({ key: 'z', metaKey: true }))
    expect(m?.id).toBe('op.undo')
  })
  it('matches Ctrl+Z to undo on Windows/Linux-style input', () => {
    const m = matchKeybinding(makeEvent({ key: 'z', ctrlKey: true }))
    expect(m?.id).toBe('op.undo')
  })
  it('matches Ctrl+Shift+Z to redo', () => {
    const m = matchKeybinding(makeEvent({ key: 'z', ctrlKey: true, shiftKey: true }))
    expect(m?.id).toBe('op.redo')
  })
  it('matches plain E to entity tool', () => {
    const m = matchKeybinding(makeEvent({ key: 'e' }))
    expect(m?.id).toBe('tool.entity')
  })
  it('returns null when no binding matches', () => {
    const m = matchKeybinding(makeEvent({ key: 'F12' }))
    expect(m).toBeNull()
  })
  it('? matches toggleCheatsheet', () => {
    const m = matchKeybinding(makeEvent({ key: '?', shiftKey: true }))
    expect(m?.id).toBe('ctx.cheatsheet')
  })
})
