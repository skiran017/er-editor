import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

export type Theme = 'light' | 'dark' | 'system'
export type Language = 'en' | 'it'

export interface Modal {
  readonly id: string
  readonly kind: string
  readonly props: Readonly<Record<string, unknown>>
}

export interface Toast {
  readonly id: string
  readonly kind: 'info' | 'success' | 'warning' | 'error'
  readonly messageKey: string
  readonly messageParams?: Readonly<Record<string, string>>
}

export interface UiStoreState {
  readonly theme: Theme
  readonly language: Language
  readonly panels: Readonly<Record<string, boolean>>
  readonly modals: readonly Modal[]
  readonly toasts: readonly Toast[]
  setTheme: (t: Theme) => void
  setLanguage: (l: Language) => void
  togglePanel: (id: string) => void
  pushModal: (m: Modal) => void
  popModal: () => void
  pushToast: (t: Toast) => void
  dismissToast: (id: string) => void
}

export const useUiStore = create<UiStoreState>()(
  subscribeWithSelector(
    persist(
      immer((set) => ({
        theme: 'system',
        language: 'en',
        panels: { properties: true, minimap: false },
        modals: [],
        toasts: [],

        setTheme: (t) => set((state) => { state.theme = t }),
        setLanguage: (l) => set((state) => { state.language = l }),

        togglePanel: (id) => set((state) => {
          const next = { ...state.panels }
          next[id] = !next[id]
          state.panels = next
        }),

        pushModal: (m) => set((state) => {
          state.modals = [...state.modals, m]
        }),

        popModal: () => set((state) => {
          state.modals = state.modals.slice(0, -1)
        }),

        pushToast: (t) => set((state) => {
          state.toasts = [...state.toasts, t]
        }),

        dismissToast: (id) => set((state) => {
          state.toasts = state.toasts.filter((t) => t.id !== id)
        }),
      })),
      {
        name: 'er-editor:ui',
        partialize: (state) => ({
          theme: state.theme,
          language: state.language,
          panels: state.panels,
        }),
      },
    ),
  ),
)
