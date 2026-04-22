import { enableMapSet } from 'immer'

// Global Immer config for Set/Map draft support — must be called once before
// any store using these collections is created. selectionStore relies on it
// and also calls enableMapSet itself for import-order safety (idempotent).
enableMapSet()

export * from './types'
export { useDiagramStore, type DiagramStoreState } from './diagramStore'
export { useViewportStore, type ViewportState } from './viewportStore'
export {
  useSelectionStore,
  type SelectionStoreState,
  type RubberbandState,
  type SelectionPayload,
} from './selectionStore'
export { useValidationStore, type ValidationStoreState } from './validationStore'
export {
  useUiStore,
  type UiStoreState,
  type Theme,
  type Language,
  type Modal,
  type Toast,
} from './uiStore'
export {
  deleteSelection,
  duplicateSelection,
  selectAll,
  clearSelection,
} from './commands'
export {
  selectNodeById,
  selectIncidentEdges,
  selectSelectedNodes,
  selectErrorsForId,
} from './selectors'
