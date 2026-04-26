// src/ui/menu/useFileActions.ts
import { openFile, downloadBlob } from '@/platform/fs'
import { chenJavaXmlCodec, mermaidCodec } from '@/notation/chen/codecs'
import { useDiagramStore } from '@/state/diagramStore'
import { useUiStore } from '@/state/uiStore'

export interface FileActionHandlers {
  readonly open: () => Promise<void>
  readonly save: () => Promise<void>
  readonly exportMermaid: () => Promise<void>
}

const timestamp = (): string => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)

export const useFileActions = (close: () => void): FileActionHandlers => {
  const pushToast = useUiStore((s) => s.pushToast)

  // Inner pipeline: file picker → parse → replace store. Used directly when
  // the canvas is empty, and via the ConfirmModal's onConfirm when not. The
  // dropdown closes here regardless of which entry path triggered it.
  const performOpen = async (): Promise<void> => {
    const file = await openFile({ accept: '.xml' })
    if (!file) { close(); return }
    try {
      const text = await file.text()
      const result = chenJavaXmlCodec.parse!(text)
      if (!result.ok) {
        pushToast({ id: `open-${Date.now()}`, kind: 'error', messageKey: 'menu:app.openFailure' })
        close()
        return
      }
      // Replace the diagram via the store. Clear temporal history so undo can't
      // reach state that predates the load.
      useDiagramStore.setState({ diagram: result.value })
      useDiagramStore.temporal.getState().clear()
      pushToast({ id: `open-${Date.now()}`, kind: 'success', messageKey: 'menu:app.openSuccess' })
    } catch (err) {
      console.error('Open failed', err)
      pushToast({ id: `open-${Date.now()}`, kind: 'error', messageKey: 'menu:app.openFailure' })
    }
    close()
  }

  const open = async (): Promise<void> => {
    // Empty canvas — go straight to the file picker, no prompt.
    const isEmpty = useDiagramStore.getState().diagram.nodeOrder.length === 0
    if (isEmpty) { await performOpen(); return }
    // Non-empty — confirm before clobbering. The ConfirmModal lives in the
    // ModalStack; close the dropdown so visual focus shifts onto the dialog.
    close()
    useUiStore.getState().pushModal({
      id: `open-confirm-${Date.now()}`,
      kind: 'confirm',
      props: {
        titleKey: 'menu:file.open',
        messageKey: 'menu:app.openConfirmReplace',
        danger: true,
        onConfirm: () => { void performOpen() },
      },
    })
  }

  const save = async (): Promise<void> => {
    try {
      const xml = chenJavaXmlCodec.serialize!(useDiagramStore.getState().diagram)
      downloadBlob(new Blob([xml], { type: 'application/xml' }), `diagram-${timestamp()}.xml`)
      pushToast({ id: `save-${Date.now()}`, kind: 'success', messageKey: 'menu:app.saveSuccess' })
    } catch (err) {
      console.error('Save failed', err)
      pushToast({ id: `save-${Date.now()}`, kind: 'error', messageKey: 'menu:app.saveFailure' })
    }
    close()
  }

  const exportMermaid = async (): Promise<void> => {
    try {
      const md = mermaidCodec.serialize!(useDiagramStore.getState().diagram)
      downloadBlob(new Blob([md], { type: 'text/plain' }), `diagram-${timestamp()}.mmd`)
      pushToast({ id: `export-${Date.now()}`, kind: 'success', messageKey: 'menu:app.exportSuccess' })
    } catch (err) {
      console.error('Mermaid export failed', err)
      pushToast({ id: `export-${Date.now()}`, kind: 'error', messageKey: 'menu:app.exportFailure' })
    }
    close()
  }

  return { open, save, exportMermaid }
}
