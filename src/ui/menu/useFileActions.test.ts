// src/ui/menu/useFileActions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFileActions } from './useFileActions'
import { useDiagramStore } from '@/state/diagramStore'
import { useUiStore } from '@/state/uiStore'
import { emptyDiagram } from '@/domain/types'
import * as fs from '@/platform/fs'

vi.mock('@/platform/fs', () => ({
  openFile: vi.fn(),
  downloadBlob: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
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
})
