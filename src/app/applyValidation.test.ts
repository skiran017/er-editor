import { describe, it, expect, beforeEach } from 'vitest'
import { applyValidationFromUrl } from './applyValidation'
import { useValidationStore } from '@/state/validationStore'

beforeEach(() => { useValidationStore.setState({ enabled: true }) })

describe('applyValidationFromUrl', () => {
  it('?validation=off disables validation for the session', () => {
    applyValidationFromUrl('?validation=off')
    expect(useValidationStore.getState().enabled).toBe(false)
  })

  it('?validation=on re-enables validation', () => {
    useValidationStore.setState({ enabled: false })
    applyValidationFromUrl('?validation=on')
    expect(useValidationStore.getState().enabled).toBe(true)
  })

  it('absent param leaves enabled untouched', () => {
    useValidationStore.setState({ enabled: false })
    applyValidationFromUrl('')
    expect(useValidationStore.getState().enabled).toBe(false)
  })

  it('is case-insensitive (delegates to parseQueryParams)', () => {
    applyValidationFromUrl('?validation=OFF')
    expect(useValidationStore.getState().enabled).toBe(false)
  })
})
