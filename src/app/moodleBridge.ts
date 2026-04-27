// src/app/moodleBridge.ts

/** Outgoing messages from the editor (child) to the embedding host (parent). */
export type EditorOutgoing =
  | { source: 'er-editor'; type: 'ready' }
  | { source: 'er-editor'; type: 'save'; xml: string }
  | { source: 'er-editor'; type: 'autosave'; xml: string }
  | { source: 'er-editor'; type: 'error'; message: string }

/** Incoming messages from the embedding host (parent) to the editor (child). */
export type EditorIncoming =
  | { source: 'moodle-er-host'; type: 'init' | 'load'; xml: string }

const resolveTargetOrigin = (params: URLSearchParams): string => {
  const explicit = params.get('parentOrigin')
  if (explicit) {
    try { return new URL(explicit).origin } catch { /* fall through */ }
  }
  const referrer = document.referrer
  if (referrer) {
    try { return new URL(referrer).origin } catch { /* fall through */ }
  }
  return '*'
}

/**
 * Install the Moodle / iframe-host postMessage bridge. Activates only when
 * `?embed=true` AND a parent window is present; otherwise installs nothing
 * and the cleanup function is a no-op.
 *
 * Returns a cleanup function — call it on hot-reload / unmount to tear
 * down listeners and pending timers.
 */
export const installMoodleBridge = (): (() => void) => {
  const params = new URLSearchParams(window.location.search)
  const embedMode = params.get('embed')?.toLowerCase() === 'true'
  if (!embedMode || window.parent === window) return () => {}

  const targetOrigin = resolveTargetOrigin(params)
  if (targetOrigin === '*') {
    console.warn(
      '[er-editor] postMessage running with origin=*; pass ?parentOrigin=... to lock down',
    )
  }

  const post = (payload: EditorOutgoing) => {
    window.parent.postMessage(payload, targetOrigin)
  }

  const handleMessage = (_e: MessageEvent) => {}
  const handlePageHide = () => {}

  window.addEventListener('message', handleMessage)
  window.addEventListener('pagehide', handlePageHide)
  window.addEventListener('beforeunload', handlePageHide)

  post({ source: 'er-editor', type: 'ready' })

  return () => {
    window.removeEventListener('message', handleMessage)
    window.removeEventListener('pagehide', handlePageHide)
    window.removeEventListener('beforeunload', handlePageHide)
  }
}
