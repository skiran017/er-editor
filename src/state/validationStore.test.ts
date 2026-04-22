import { describe, it, expect, beforeEach } from 'vitest'
import { useValidationStore } from './validationStore'
import { asNodeId, asEdgeId } from '@/domain/id'
import type { ValidationError } from '@/domain/types'

const n1 = asNodeId('n000000001')
const n2 = asNodeId('n000000002')
const e1 = asEdgeId('e000000001')

const err = (targetId: string, ruleId: string): ValidationError => ({
  ruleId, severity: 'error', targetId: targetId as never, messageKey: `m.${ruleId}`,
})

const reset = () =>
  useValidationStore.setState({ errorsById: {}, enabled: true })

describe('validationStore — setErrors', () => {
  beforeEach(reset)
  it('groups flat array into errorsById by targetId', () => {
    useValidationStore.getState().setErrors([
      err(n1, 'r1'), err(n1, 'r2'), err(n2, 'r1'), err(e1, 'r3'),
    ])
    const { errorsById } = useValidationStore.getState()
    expect(errorsById[n1]).toHaveLength(2)
    expect(errorsById[n2]).toHaveLength(1)
    expect(errorsById[e1]).toHaveLength(1)
  })
  it('replaces existing errors on each call', () => {
    useValidationStore.getState().setErrors([err(n1, 'r1')])
    useValidationStore.getState().setErrors([err(n2, 'r2')])
    const { errorsById } = useValidationStore.getState()
    expect(errorsById[n1]).toBeUndefined()
    expect(errorsById[n2]).toHaveLength(1)
  })
})

describe('validationStore — enabled', () => {
  beforeEach(reset)
  it('setEnabled flips flag', () => {
    useValidationStore.getState().setEnabled(false)
    expect(useValidationStore.getState().enabled).toBe(false)
    useValidationStore.getState().setEnabled(true)
    expect(useValidationStore.getState().enabled).toBe(true)
  })
  it('default enabled is true', () => {
    expect(useValidationStore.getState().enabled).toBe(true)
  })
})

describe('validationStore — clear', () => {
  beforeEach(reset)
  it('empties errorsById without touching enabled', () => {
    useValidationStore.getState().setErrors([err(n1, 'r1')])
    useValidationStore.getState().setEnabled(false)
    useValidationStore.getState().clear()
    expect(useValidationStore.getState().errorsById).toEqual({})
    expect(useValidationStore.getState().enabled).toBe(false)
  })
})
