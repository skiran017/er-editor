import { describe, it, expect } from 'vitest'
import { useInteractionStore } from './interactionStore'

describe('interactionStore — stub', () => {
  it('starts with snapshot.value === "idle"', () => {
    expect(useInteractionStore.getState().snapshot.value).toBe('idle')
  })

  it('send() accepts any event without throwing (stub)', () => {
    expect(() =>
      useInteractionStore.getState().send({ type: 'PICK_TOOL', tool: 'entity' } as never)
    ).not.toThrow()
  })
})
