import { describe, it, expect, beforeEach } from 'vitest'
import { resolveExamModeFromSearch, applyExamModeFromUrl } from './examMode'
import { useUiStore } from '@/state/uiStore'

const reset = () => {
  useUiStore.getState().setExamMode(false)
}

describe('resolveExamModeFromSearch', () => {
  it('returns false for an empty query string', () => {
    expect(resolveExamModeFromSearch('')).toBe(false)
  })

  it('returns true when examMode=true is present', () => {
    expect(resolveExamModeFromSearch('?examMode=true')).toBe(true)
  })

  it('returns false when examMode=false is present', () => {
    expect(resolveExamModeFromSearch('?examMode=false')).toBe(false)
  })

  it('defaults to true in embed mode (?embed=true) when examMode is not set', () => {
    expect(resolveExamModeFromSearch('?embed=true')).toBe(true)
  })

  it('lets an explicit examMode=false override the embed-default', () => {
    expect(resolveExamModeFromSearch('?embed=true&examMode=false')).toBe(false)
  })

  it('returns false when embed is not true and examMode is not set', () => {
    expect(resolveExamModeFromSearch('?embed=false&foo=bar')).toBe(false)
  })
})

describe('applyExamModeFromUrl', () => {
  beforeEach(reset)

  it('writes the resolved flag onto the ui store', () => {
    // jsdom lets us edit window.location.search via history.replaceState.
    window.history.replaceState(null, '', '/?examMode=true')
    applyExamModeFromUrl()
    expect(useUiStore.getState().examMode).toBe(true)
  })

  it('clears the flag when the URL explicitly disables exam mode', () => {
    useUiStore.getState().setExamMode(true)
    window.history.replaceState(null, '', '/?examMode=false')
    applyExamModeFromUrl()
    expect(useUiStore.getState().examMode).toBe(false)
  })
})
