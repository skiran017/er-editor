// src/app/moodleBridge.ts
import { useDiagramStore } from '@/state/diagramStore'
import { chenJavaXmlCodec } from '@/notation/chen/codecs/javaXml'
import type { Diagram } from '@/domain/types'

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

  const serializeOrError = (diagram: Diagram): string | null => {
    try {
      return chenJavaXmlCodec.serialize!(diagram)
    } catch (err) {
      post({
        source: 'er-editor',
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to serialize diagram',
      })
      return null
    }
  }

  const AUTOSAVE_DEBOUNCE_MS = 800
  let autosaveTimer: ReturnType<typeof setTimeout> | null = null

  const flush = (kind: 'save' | 'autosave') => {
    if (autosaveTimer !== null) {
      clearTimeout(autosaveTimer)
      autosaveTimer = null
    }
    const xml = serializeOrError(useDiagramStore.getState().diagram)
    if (xml !== null) post({ source: 'er-editor', type: kind, xml })
  }

  const scheduleAutosave = () => {
    if (autosaveTimer !== null) clearTimeout(autosaveTimer)
    autosaveTimer = setTimeout(() => { flush('autosave') }, AUTOSAVE_DEBOUNCE_MS)
  }

  const unsubscribeDiagram = useDiagramStore.subscribe(
    (s) => s.diagram,
    () => { scheduleAutosave() },
  )

  const handleMessage = (_e: MessageEvent) => {}
  const handlePageHide = () => { flush('save') }

  window.addEventListener('message', handleMessage)
  window.addEventListener('pagehide', handlePageHide)
  window.addEventListener('beforeunload', handlePageHide)

  post({ source: 'er-editor', type: 'ready' })

  return () => {
    if (autosaveTimer !== null) clearTimeout(autosaveTimer)
    unsubscribeDiagram()
    window.removeEventListener('message', handleMessage)
    window.removeEventListener('pagehide', handlePageHide)
    window.removeEventListener('beforeunload', handlePageHide)
  }
}
