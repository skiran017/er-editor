import { describe, it, expect, beforeEach } from 'vitest'
import { applyModeFromUrl } from './applyMode'
import { useUiStore } from '@/state/uiStore'

beforeEach(() => { useUiStore.setState({ readonly: false, embed: false }) })

describe('applyModeFromUrl', () => {
  it('applies ?readonly=true and ?embed=true', () => {
    applyModeFromUrl('?readonly=true&embed=true')
    const s = useUiStore.getState()
    expect(s.readonly).toBe(true)
    expect(s.embed).toBe(true)
  })

  it('clears both flags on an empty query (URL is source of truth)', () => {
    useUiStore.setState({ readonly: true, embed: true })
    applyModeFromUrl('')
    const s = useUiStore.getState()
    expect(s.readonly).toBe(false)
    expect(s.embed).toBe(false)
  })

  it('readonly only', () => {
    applyModeFromUrl('?readonly=true')
    const s = useUiStore.getState()
    expect(s.readonly).toBe(true)
    expect(s.embed).toBe(false)
  })

  it('embed only (also defaults examMode on per parseQueryParams)', () => {
    applyModeFromUrl('?embed=true')
    const s = useUiStore.getState()
    expect(s.readonly).toBe(false)
    expect(s.embed).toBe(true)
  })

  it('is case-insensitive (delegates to parseQueryParams)', () => {
    applyModeFromUrl('?readonly=TRUE&embed=True')
    const s = useUiStore.getState()
    expect(s.readonly).toBe(true)
    expect(s.embed).toBe(true)
  })
})
