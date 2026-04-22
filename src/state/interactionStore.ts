import { createActor, setup } from 'xstate'
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

// Phase 2 delivers the store shell. Phase 3 replaces this machine with
// the full FSM from spec §4.6 (placing/drawing/quickRelationship/etc.).
const stubMachine = setup({
  types: {} as { events: { type: string } & Record<string, unknown> },
}).createMachine({
  id: 'editorStub',
  initial: 'idle',
  states: { idle: {} },
})

type Snapshot = ReturnType<ReturnType<typeof createActor<typeof stubMachine>>['getSnapshot']>

export interface InteractionStoreState {
  readonly snapshot: Snapshot
  send: (event: { type: string } & Record<string, unknown>) => void
}

const actor = createActor(stubMachine)
actor.start()

export const useInteractionStore = create<InteractionStoreState>()(
  subscribeWithSelector(
    (set) => {
      actor.subscribe((s) => set({ snapshot: s }))
      return {
        snapshot: actor.getSnapshot(),
        send: (event) => actor.send(event as never),
      }
    },
  ),
)
