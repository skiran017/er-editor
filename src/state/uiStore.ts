import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { NodeId } from '@/domain/types'

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

export interface UiSnapConfig {
  readonly gridEnabled: boolean
  readonly gridSize: number
  readonly alignmentEnabled: boolean
  readonly alignmentThreshold: number
}

export interface ContextMenuItem {
  readonly id: string
  readonly labelKey: string
  readonly shortcut?: string
  readonly danger?: boolean
  readonly disabled?: boolean
  readonly onSelect: () => void
}

export interface ContextMenuState {
  readonly at: { readonly x: number; readonly y: number }
  readonly items: readonly ContextMenuItem[]
}

export interface InlineRenameState {
  readonly nodeId: NodeId
  readonly initialValue: string
}

export interface UiStoreState {
  readonly theme: Theme
  readonly language: Language
  readonly panels: Readonly<Record<string, boolean>>
  readonly modals: readonly Modal[]
  readonly toasts: readonly Toast[]
  readonly snap: UiSnapConfig
  readonly contextMenu: ContextMenuState | null
  readonly inlineRename: InlineRenameState | null
  setTheme: (t: Theme) => void
  setLanguage: (l: Language) => void
  togglePanel: (id: string) => void
  pushModal: (m: Modal) => void
  popModal: () => void
  pushToast: (t: Toast) => void
  dismissToast: (id: string) => void
  setSnap: (patch: Partial<UiSnapConfig>) => void
  openContextMenu: (state: ContextMenuState) => void
  closeContextMenu: () => void
  startInlineRename: (state: InlineRenameState) => void
  cancelInlineRename: () => void
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
        snap: {
          gridEnabled: false,
          gridSize: 10,
          alignmentEnabled: true,
          alignmentThreshold: 4,
        },
        contextMenu: null,
        inlineRename: null,

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

        setSnap: (patch) => set((state) => { Object.assign(state.snap, patch) }),

        openContextMenu: (s) => set((state) => {
          // Immer's WritableDraft strips readonly; cast through unknown to bridge the shape.
          state.contextMenu = s as unknown as typeof state.contextMenu
        }),
        closeContextMenu: () => set((state) => { state.contextMenu = null }),

        startInlineRename: (s) => set((state) => {
          state.inlineRename = s as unknown as typeof state.inlineRename
        }),
        cancelInlineRename: () => set((state) => { state.inlineRename = null }),
      })),
      {
        name: 'er-editor:ui',
        partialize: (state) => ({
          theme: state.theme,
          language: state.language,
          panels: state.panels,
          snap: state.snap,
        }),
      },
    ),
  ),
)
