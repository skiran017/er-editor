import { toPng, canvasToSvg, inlineComputedStyles, forceLightMode } from '@/platform/imageExport'
import { downloadBlob } from '@/platform/fs'
import { useUiStore } from '@/state/uiStore'

const downloadDataUrl = async (dataUrl: string, filename: string): Promise<void> => {
  const blob = await (await fetch(dataUrl)).blob()
  downloadBlob(blob, filename)
}

const timestamp = (): string => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)

const findCanvas = (): HTMLElement | null =>
  document.querySelector('.react-flow__viewport') as HTMLElement | null

export interface ExportHandlers {
  readonly exportPng: () => Promise<void>
  readonly exportSvg: () => Promise<void>
}

export const useExportHandlers = (close: () => void): ExportHandlers => {
  const pushToast = useUiStore((s) => s.pushToast)

  const exportPng = async (): Promise<void> => {
    const el = findCanvas()
    if (!el) {
      pushToast({ id: `export-${Date.now()}`, kind: 'error', messageKey: 'menu:app.exportFailure' })
      return
    }
    const restoreLight = forceLightMode()
    const restoreInline = inlineComputedStyles(el)
    try {
      const dataUrl = await toPng(el)
      await downloadDataUrl(dataUrl, `diagram-${timestamp()}.png`)
      pushToast({ id: `export-${Date.now()}`, kind: 'success', messageKey: 'menu:app.exportSuccess' })
    } catch (err) {
      console.error('PNG export failed', err)
      pushToast({ id: `export-${Date.now()}`, kind: 'error', messageKey: 'menu:app.exportFailure' })
    } finally {
      // Order matters: remove our inlined overrides first, then restore the
      // dark class. Reverse order would briefly show light-mode values on a
      // dark UI between the two restores.
      restoreInline()
      restoreLight()
    }
    close()
  }

  const exportSvg = async (): Promise<void> => {
    const el = findCanvas()
    if (!el) {
      pushToast({ id: `export-${Date.now()}`, kind: 'error', messageKey: 'menu:app.exportFailure' })
      return
    }
    const restoreLight = forceLightMode()
    const restoreInline = inlineComputedStyles(el)
    try {
      const dataUrl = await canvasToSvg(el)
      await downloadDataUrl(dataUrl, `diagram-${timestamp()}.svg`)
      pushToast({ id: `export-${Date.now()}`, kind: 'success', messageKey: 'menu:app.exportSuccess' })
    } catch (err) {
      console.error('SVG export failed', err)
      pushToast({ id: `export-${Date.now()}`, kind: 'error', messageKey: 'menu:app.exportFailure' })
    } finally {
      // Order matters: remove our inlined overrides first, then restore the
      // dark class. Reverse order would briefly show light-mode values on a
      // dark UI between the two restores.
      restoreInline()
      restoreLight()
    }
    close()
  }

  return { exportPng, exportSvg }
}
