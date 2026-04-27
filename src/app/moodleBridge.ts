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

/**
 * Install the Moodle / iframe-host postMessage bridge. Activates only when
 * `?embed=true` AND a parent window is present; otherwise installs nothing
 * and the cleanup function is a no-op.
 *
 * Returns a cleanup function — call it on hot-reload / unmount to tear
 * down listeners and pending timers.
 */
export const installMoodleBridge = (): (() => void) => {
  // Filled in by subsequent tasks.
  return () => {}
}
