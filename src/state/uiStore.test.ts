import { describe, it, expect, beforeEach } from 'vitest'
import { useUiStore } from './uiStore'

const reset = () => useUiStore.setState({
  theme: 'system',
  language: 'en',
  panels: { properties: true, minimap: false },
  modals: [],
  toasts: [],
})

describe('uiStore — theme + language', () => {
  beforeEach(reset)
  it('setTheme updates theme', () => {
    useUiStore.getState().setTheme('dark')
    expect(useUiStore.getState().theme).toBe('dark')
  })
  it('setLanguage updates language', () => {
    useUiStore.getState().setLanguage('it')
    expect(useUiStore.getState().language).toBe('it')
  })
})

describe('uiStore — panels', () => {
  beforeEach(reset)
  it('togglePanel flips the flag', () => {
    useUiStore.getState().togglePanel('minimap')
    expect(useUiStore.getState().panels.minimap).toBe(true)
    useUiStore.getState().togglePanel('minimap')
    expect(useUiStore.getState().panels.minimap).toBe(false)
  })
})

describe('uiStore — modal stack', () => {
  beforeEach(reset)
  it('push + pop LIFO', () => {
    const s = useUiStore.getState()
    s.pushModal({ id: 'm1', kind: 'confirm', props: {} })
    s.pushModal({ id: 'm2', kind: 'cheatsheet', props: {} })
    expect(useUiStore.getState().modals.map((m) => m.id)).toEqual(['m1', 'm2'])
    s.popModal()
    expect(useUiStore.getState().modals.map((m) => m.id)).toEqual(['m1'])
  })
})

describe('uiStore — toasts', () => {
  beforeEach(reset)
  it('pushToast appends', () => {
    useUiStore.getState().pushToast({ id: 't1', kind: 'info', messageKey: 'hello' })
    expect(useUiStore.getState().toasts.map((t) => t.id)).toEqual(['t1'])
  })
  it('dismissToast removes by id', () => {
    useUiStore.getState().pushToast({ id: 't1', kind: 'info', messageKey: 'a' })
    useUiStore.getState().pushToast({ id: 't2', kind: 'info', messageKey: 'b' })
    useUiStore.getState().dismissToast('t1')
    expect(useUiStore.getState().toasts.map((t) => t.id)).toEqual(['t2'])
  })
})
