import { createActor } from 'xstate'
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { editorMachine } from './machine'
import type { EditorEvent } from './events'

type Snapshot = ReturnType<ReturnType<typeof createActor<typeof editorMachine>>['getSnapshot']>

export interface InteractionStoreState {
  readonly snapshot: Snapshot
  send: (event: EditorEvent) => void
}

const actor = createActor(editorMachine)
actor.start()

export const useInteractionStore = create<InteractionStoreState>()(
  subscribeWithSelector((set) => {
    actor.subscribe((s) => set({ snapshot: s }))
    return {
      snapshot: actor.getSnapshot(),
      send: (event) => actor.send(event),
    }
  }),
)
