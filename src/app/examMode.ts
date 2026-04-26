import { useUiStore } from '@/state/uiStore'
import { parseQueryParams } from './queryParams'

// Legacy parity (src/legacy/App.tsx): exam mode turns on when `?examMode=true`
// is present on the URL, OR when `?embed=true` is set and `examMode` isn't
// explicitly disabled. The embed-first default ensures a student editor
// launched inside a Moodle iframe is locked down out of the box.
export const resolveExamModeFromSearch = (search: string): boolean =>
  parseQueryParams(search).examMode

/**
 * Reads the current URL's query string and applies the resolved exam-mode
 * flag to the UI store. Called once from main.tsx on startup. Exam mode is
 * NOT persisted — the URL is the source of truth, so reloading with a
 * different URL re-resolves the flag cleanly.
 */
export const applyExamModeFromUrl = (): void => {
  if (typeof window === 'undefined') return
  useUiStore.getState().setExamMode(resolveExamModeFromSearch(window.location.search))
}
