// src/ui/menu/useFileActions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFileActions } from './useFileActions'
import { useDiagramStore } from '@/state/diagramStore'
import { useUiStore } from '@/state/uiStore'
import { emptyDiagram } from '@/domain/types'
import * as fs from '@/platform/fs'
import * as codecs from '@/notation/chen/codecs'

vi.mock('@/platform/fs', () => ({
  openFile: vi.fn(),
  downloadBlob: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
  useDiagramStore.setState({ diagram: emptyDiagram() })
  useUiStore.setState({ toasts: [] })
})

describe('useFileActions', () => {
  it('open: reads file, parses, replaces diagram, toasts success', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ERDatabaseModel><ERDatabaseSchema name="X" lastId="1"><EntitySets><StrongEntitySet id="1" name="A"><Attributes /></StrongEntitySet></EntitySets><RelationshipSets /><Generalizations /></ERDatabaseSchema><ERDatabaseDiagram /></ERDatabaseModel>`
    const file = new File([xml], 'a.xml')
    // jsdom's File may not implement .text() — polyfill for the test environment
    if (typeof file.text !== 'function') {
      Object.defineProperty(file, 'text', { value: () => Promise.resolve(xml) })
    }
    vi.mocked(fs.openFile).mockResolvedValue(file)
    const close = vi.fn()
    const { result } = renderHook(() => useFileActions(close))

    await act(async () => { await result.current.open() })

    expect(useDiagramStore.getState().diagram.nodeOrder).toHaveLength(1)
    expect(useUiStore.getState().toasts.some((t) => t.messageKey === 'menu:app.openSuccess')).toBe(true)
    expect(close).toHaveBeenCalled()
  })

  it('open: toasts failure on bad XML', async () => {
    const badFile = new File(['not xml'], 'bad.xml')
    if (typeof badFile.text !== 'function') {
      Object.defineProperty(badFile, 'text', { value: () => Promise.resolve('not xml') })
    }
    vi.mocked(fs.openFile).mockResolvedValue(badFile)
    const close = vi.fn()
    const { result } = renderHook(() => useFileActions(close))

    await act(async () => { await result.current.open() })

    expect(useUiStore.getState().toasts.some((t) => t.messageKey === 'menu:app.openFailure')).toBe(true)
  })

  it('open: cancels (file=null) without modifying diagram or toasting', async () => {
    vi.mocked(fs.openFile).mockResolvedValue(null)
    const close = vi.fn()
    const { result } = renderHook(() => useFileActions(close))

    await act(async () => { await result.current.open() })

    expect(useUiStore.getState().toasts).toHaveLength(0)
    expect(close).toHaveBeenCalled()
  })

  it('open: with non-empty canvas, pushes a confirm modal instead of opening the file picker', async () => {
    // Seed the canvas with one node so the open() flow has to ask before
    // clobbering. We assert that no openFile call happens — only the modal.
    useDiagramStore.getState().addNode({
      kind: 'entity', name: 'A', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const close = vi.fn()
    const { result } = renderHook(() => useFileActions(close))

    await act(async () => { await result.current.open() })

    expect(fs.openFile).not.toHaveBeenCalled()
    const modal = useUiStore.getState().modals.at(-1)
    expect(modal?.kind).toBe('confirm')
    expect((modal?.props as { messageKey: string }).messageKey).toBe('menu:app.openConfirmReplace')
    // Dropdown still closes so focus shifts to the dialog.
    expect(close).toHaveBeenCalled()
  })

  it('open: confirm modal\'s onConfirm runs the actual file picker + replaces the diagram', async () => {
    useDiagramStore.getState().addNode({
      kind: 'entity', name: 'A', isWeak: false,
      position: { x: 0, y: 0 }, size: { width: 120, height: 60 },
    })
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ERDatabaseModel><ERDatabaseSchema name="X" lastId="1"><EntitySets><StrongEntitySet id="1" name="B"><Attributes /></StrongEntitySet></EntitySets><RelationshipSets /><Generalizations /></ERDatabaseSchema><ERDatabaseDiagram /></ERDatabaseModel>`
    const file = new File([xml], 'b.xml')
    if (typeof file.text !== 'function') {
      Object.defineProperty(file, 'text', { value: () => Promise.resolve(xml) })
    }
    vi.mocked(fs.openFile).mockResolvedValue(file)
    const close = vi.fn()
    const { result } = renderHook(() => useFileActions(close))

    await act(async () => { await result.current.open() })
    const modal = useUiStore.getState().modals.at(-1)
    expect(modal?.kind).toBe('confirm')
    // Drive the confirm path explicitly — the real ConfirmModal would do this
    // via its primary button.
    await act(async () => {
      await (modal!.props as { onConfirm: () => void | Promise<void> }).onConfirm()
    })

    expect(fs.openFile).toHaveBeenCalledOnce()
    expect(useDiagramStore.getState().diagram.nodeOrder).toHaveLength(1)
    expect(
      useDiagramStore.getState().diagram.nodesById[
        useDiagramStore.getState().diagram.nodeOrder[0]!
      ]!.kind,
    ).toBe('entity')
  })

  it('save: serializes via chenJavaXmlCodec and downloads', async () => {
    const close = vi.fn()
    const { result } = renderHook(() => useFileActions(close))

    await act(async () => { await result.current.save() })

    expect(fs.downloadBlob).toHaveBeenCalledOnce()
    const [blob, filename] = vi.mocked(fs.downloadBlob).mock.calls[0]!
    expect(blob.type).toBe('application/xml')
    expect(filename).toMatch(/\.xml$/)
    expect(useUiStore.getState().toasts.some((t) => t.messageKey === 'menu:app.saveSuccess')).toBe(true)
  })

  it('exportMermaid: serializes via mermaidCodec and downloads .mmd', async () => {
    const close = vi.fn()
    const { result } = renderHook(() => useFileActions(close))

    await act(async () => { await result.current.exportMermaid() })

    expect(fs.downloadBlob).toHaveBeenCalledOnce()
    const [, filename] = vi.mocked(fs.downloadBlob).mock.calls[0]!
    expect(filename).toMatch(/\.mmd$/)
    expect(useUiStore.getState().toasts.some((t) => t.messageKey === 'menu:app.exportSuccess')).toBe(true)
  })

  it('open: toasts failure when file.text() throws', async () => {
    const file = new File([''], 'throw.xml')
    Object.defineProperty(file, 'text', { value: () => Promise.reject(new Error('read error')) })
    vi.mocked(fs.openFile).mockResolvedValue(file)
    const close = vi.fn()
    const { result } = renderHook(() => useFileActions(close))

    await act(async () => { await result.current.open() })

    expect(useUiStore.getState().toasts.some((t) => t.messageKey === 'menu:app.openFailure')).toBe(true)
    expect(close).toHaveBeenCalled()
  })

  it('save: toasts failure when chenJavaXmlCodec.serialize throws', async () => {
    // serialize is optional in the Codec type; double-cast to mutate it per test.
    const codec = codecs.chenJavaXmlCodec as unknown as Record<string, unknown>
    const origSerialize = codec['serialize']
    codec['serialize'] = () => { throw new Error('serialize error') }
    const close = vi.fn()
    const { result } = renderHook(() => useFileActions(close))

    await act(async () => { await result.current.save() })

    codec['serialize'] = origSerialize
    expect(useUiStore.getState().toasts.some((t) => t.messageKey === 'menu:app.saveFailure')).toBe(true)
    expect(close).toHaveBeenCalled()
  })

  it('exportMermaid: toasts failure when mermaidCodec.serialize throws', async () => {
    const codec = codecs.mermaidCodec as unknown as Record<string, unknown>
    const origSerialize = codec['serialize']
    codec['serialize'] = () => { throw new Error('mermaid error') }
    const close = vi.fn()
    const { result } = renderHook(() => useFileActions(close))

    await act(async () => { await result.current.exportMermaid() })

    codec['serialize'] = origSerialize
    expect(useUiStore.getState().toasts.some((t) => t.messageKey === 'menu:app.exportFailure')).toBe(true)
    expect(close).toHaveBeenCalled()
  })
})
