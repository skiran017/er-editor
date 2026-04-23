import { useUiStore } from '@/state/uiStore'

// Legacy parity (src/legacy/App.tsx): exam mode turns on when `?examMode=true`
// is present on the URL, OR when `?embed=true` is set and `examMode` isn't
// explicitly disabled. The embed-first default ensures a student editor
// launched inside a Moodle iframe is locked down out of the box.
export const resolveExamModeFromSearch = (search: string): boolean => {
  const params = new URLSearchParams(search)
  const examParam = params.get('examMode')
  if (examParam === 'true') return true
  if (examParam === 'false') return false
  return params.get('embed') === 'true'
}

/**
 * Reads the current URL's query string and applies the resolved exam-mode
 * flag to the UI store. Called once from main.tsx on startup. Exam mode is
 * NOT persisted — the URL is the source of truth, so reloading with a
 * different URL re-resolves the flag cleanly.
 */
export const applyExamModeFromUrl = (): void => {
  if (typeof window === 'undefined') return
  const on = resolveExamModeFromSearch(window.location.search)
  useUiStore.getState().setExamMode(on)
}
