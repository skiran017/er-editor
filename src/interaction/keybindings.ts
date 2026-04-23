import type { EditorEvent } from './events'

export type KeybindingCategory = 'tool' | 'operation' | 'contextual' | 'navigation'
export type KeybindingContext = 'always' | 'hasSelection' | 'notInTextField'

export interface Keybinding {
  readonly id: string
  readonly keys: readonly string[]   // e.g. ['Ctrl+Z', 'Meta+Z']
  readonly when: KeybindingContext
  readonly event: EditorEvent
  readonly descriptionKey: string
  readonly category: KeybindingCategory
}

// Canonical modifier order: Ctrl, Meta, Shift, Alt, then the key itself.
// "Key" is the single-char uppercase for letters, or the event.key verbatim
// for special keys (Escape, Space, ArrowUp, Delete, Enter, F2, ?, 0, +, -).
export const normaliseKeyCombo = (event: KeyboardEvent): string => {
  const parts: string[] = []
  if (event.ctrlKey) parts.push('Ctrl')
  if (event.metaKey) parts.push('Meta')
  if (event.shiftKey) parts.push('Shift')
  if (event.altKey) parts.push('Alt')
  const key = event.key
  if (key.length === 1 && /[a-zA-Z]/.test(key)) parts.push(key.toUpperCase())
  else if (key === ' ') parts.push('Space')
  else parts.push(key)
  return parts.join('+')
}

// Helpers to keep the registry concise.
const tool = (id: string, keys: string[], tool: EditorEvent & { type: 'PICK_TOOL' }): Keybinding => ({
  id, keys, when: 'notInTextField', event: tool,
  descriptionKey: `keybinding.${id}`, category: 'tool',
})
const op = (id: string, keys: string[], event: EditorEvent): Keybinding => ({
  id, keys, when: 'notInTextField', event,
  descriptionKey: `keybinding.${id}`, category: 'operation',
})
const ctx = (id: string, keys: string[], event: EditorEvent, when: KeybindingContext = 'notInTextField'): Keybinding => ({
  id, keys, when, event,
  descriptionKey: `keybinding.${id}`, category: 'contextual',
})

export const keybindings: readonly Keybinding[] = Object.freeze([
  // Tools
  tool('tool.select',                    ['V'],                 { type: 'PICK_TOOL', tool: 'select' }),
  tool('tool.pan',                       ['H', 'Space'],        { type: 'PICK_TOOL', tool: 'pan' }),
  tool('tool.entity',                    ['E'],                 { type: 'PICK_TOOL', tool: 'entity' }),
  tool('tool.relationship',              ['R'],                 { type: 'PICK_TOOL', tool: 'relationship' }),
  tool('tool.attribute',                 ['A'],                 { type: 'PICK_TOOL', tool: 'attribute' }),
  tool('tool.isa',                       ['G'],                 { type: 'PICK_TOOL', tool: 'isa' }),
  tool('tool.connect',                   ['C'],                 { type: 'PICK_TOOL', tool: 'connect' }),

  // Operations
  op('op.undo',                          ['Ctrl+Z', 'Meta+Z'],  { type: 'UNDO' }),
  op('op.redo',                          ['Ctrl+Shift+Z', 'Meta+Shift+Z'], { type: 'REDO' }),
  op('op.copy',                          ['Ctrl+C', 'Meta+C'],  { type: 'COPY' }),
  op('op.cut',                           ['Ctrl+X', 'Meta+X'],  { type: 'CUT' }),
  op('op.paste',                         ['Ctrl+V', 'Meta+V'],  { type: 'PASTE' }),
  op('op.duplicate',                     ['Ctrl+D', 'Meta+D'],  { type: 'DUPLICATE' }),
  op('op.selectAll',                     ['Ctrl+A', 'Meta+A'],  { type: 'SELECT_ALL' }),
  op('op.fit',                           ['Ctrl+0', 'Meta+0'],  { type: 'FIT' }),
  op('op.zoomIn',                        ['Ctrl++', 'Meta++'],  { type: 'ZOOM_IN' }),
  op('op.zoomOut',                       ['Ctrl+-', 'Meta+-'],  { type: 'ZOOM_OUT' }),

  // Contextual
  ctx('ctx.delete',                      ['Delete', 'Backspace'], { type: 'DELETE' }, 'hasSelection'),
  ctx('ctx.escape',                      ['Escape'],            { type: 'ESCAPE' }, 'always'),
  ctx('ctx.rename',                      ['Enter', 'F2'],       { type: 'RENAME' }, 'hasSelection'),
  ctx('ctx.cheatsheet',                  ['Shift+?'],           { type: 'TOGGLE_CHEATSHEET' }, 'always'),
  ctx('ctx.nudgeUp',                     ['ArrowUp'],           { type: 'NUDGE', dx: 0, dy: -1 }, 'hasSelection'),
  ctx('ctx.nudgeDown',                   ['ArrowDown'],         { type: 'NUDGE', dx: 0, dy: 1 }, 'hasSelection'),
  ctx('ctx.nudgeLeft',                   ['ArrowLeft'],         { type: 'NUDGE', dx: -1, dy: 0 }, 'hasSelection'),
  ctx('ctx.nudgeRight',                  ['ArrowRight'],        { type: 'NUDGE', dx: 1, dy: 0 }, 'hasSelection'),
  ctx('ctx.nudgeUpBig',                  ['Shift+ArrowUp'],     { type: 'NUDGE', dx: 0, dy: -10 }, 'hasSelection'),
  ctx('ctx.nudgeDownBig',                ['Shift+ArrowDown'],   { type: 'NUDGE', dx: 0, dy: 10 }, 'hasSelection'),
  ctx('ctx.nudgeLeftBig',                ['Shift+ArrowLeft'],   { type: 'NUDGE', dx: -10, dy: 0 }, 'hasSelection'),
  ctx('ctx.nudgeRightBig',               ['Shift+ArrowRight'],  { type: 'NUDGE', dx: 10, dy: 0 }, 'hasSelection'),
  // Tab / Shift+Tab do native focus traversal in text fields — keep them
  // scoped to 'notInTextField' so typing in the property panel behaves.
  ctx('ctx.cycleForward',                ['Tab'],               { type: 'CYCLE_SELECTION', direction: 'forward' }, 'notInTextField'),
  ctx('ctx.cycleBackward',               ['Shift+Tab'],         { type: 'CYCLE_SELECTION', direction: 'backward' }, 'notInTextField'),
  ctx('ctx.invertSelection',             ['Shift+Alt+A'],       { type: 'INVERT_SELECTION' }, 'notInTextField'),
])

// Build an O(1) lookup: combo string → binding.
const comboIndex = ((): ReadonlyMap<string, Keybinding> => {
  const m = new Map<string, Keybinding>()
  for (const kb of keybindings) {
    for (const combo of kb.keys) m.set(combo, kb)
  }
  return m
})()

export const matchKeybinding = (event: KeyboardEvent): Keybinding | null => {
  const combo = normaliseKeyCombo(event)
  return comboIndex.get(combo) ?? null
}
