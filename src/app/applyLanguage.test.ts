import { describe, it, expect, beforeEach } from 'vitest'
import { applyLanguageFromUrl } from './applyLanguage'
import { useUiStore } from '@/state/uiStore'

beforeEach(() => { useUiStore.setState({ language: 'en' }) })

describe('applyLanguageFromUrl', () => {
  it('writes ?lang=it to uiStore.language', () => {
    applyLanguageFromUrl('?lang=it')
    expect(useUiStore.getState().language).toBe('it')
  })

  it('leaves uiStore.language alone when ?lang is absent', () => {
    useUiStore.setState({ language: 'it' })
    applyLanguageFromUrl('')
    expect(useUiStore.getState().language).toBe('it')
  })

  it('leaves uiStore.language alone when ?lang is unknown', () => {
    applyLanguageFromUrl('?lang=xx')
    expect(useUiStore.getState().language).toBe('en')
  })

  it('is case-insensitive (delegates to parseQueryParams)', () => {
    applyLanguageFromUrl('?lang=IT')
    expect(useUiStore.getState().language).toBe('it')
  })
})
