import { describe, it, expect } from 'vitest'
import { useInteractionStore } from './interactionStore'

describe('interactionStore', () => {
  it('initial snapshot is selecting.idle', () => {
    const s = useInteractionStore.getState().snapshot
    expect(s.matches({ selecting: 'idle' })).toBe(true)
  })

  it('send() advances the machine', () => {
    useInteractionStore.getState().send({ type: 'PICK_TOOL', tool: 'entity' })
    const s = useInteractionStore.getState().snapshot
    expect(s.matches({ placing: 'entity' })).toBe(true)
    // Reset to select for downstream tests.
    useInteractionStore.getState().send({ type: 'PICK_TOOL', tool: 'select' })
  })
})
