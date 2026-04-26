// src/ui/menu/useExportHandlers.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useExportHandlers } from './useExportHandlers'
import { useUiStore } from '@/state/uiStore'

// Mock all platform/imageExport and platform/fs dependencies so we don't hit
// canvas APIs in jsdom.
vi.mock('@/platform/imageExport', () => ({
  toPng: vi.fn(),
  canvasToSvg: vi.fn(),
  inlineComputedStyles: vi.fn(() => vi.fn()),
  forceLightMode: vi.fn(() => vi.fn()),
}))
vi.mock('@/platform/fs', () => ({
  downloadBlob: vi.fn(),
  openFile: vi.fn(),
}))

import * as imageExport from '@/platform/imageExport'
import * as fs from '@/platform/fs'

// requestAnimationFrame is not available in jsdom — polyfill it so nextFrame
// resolves synchronously.
vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
  cb(0)
  return 0
})

// fetch is used by downloadDataUrl — stub it to return a blob.
vi.stubGlobal('fetch', vi.fn(async () => ({
  blob: async () => new Blob(['data'], { type: 'image/png' }),
})))

beforeEach(() => {
  vi.clearAllMocks()
  useUiStore.setState({ toasts: [], modals: [] })
})

describe('useExportHandlers', () => {
  it('exportPng: toasts error when no canvas element is found', async () => {
    // No .react-flow__viewport in the DOM → findCanvas returns null → error toast
    const close = vi.fn()
    const { result } = renderHook(() => useExportHandlers(close))

    await act(async () => { await result.current.exportPng() })

    expect(useUiStore.getState().toasts.some((t) => t.messageKey === 'menu:app.exportFailure')).toBe(true)
    expect(close).not.toHaveBeenCalled()
  })

  it('exportPng: runs full flow and toasts success when canvas is found', async () => {
    // Inject a fake canvas element.
    const el = document.createElement('div')
    el.className = 'react-flow__viewport'
    document.body.appendChild(el)

    vi.mocked(imageExport.toPng).mockResolvedValue('data:image/png;base64,abc')
    vi.mocked(imageExport.inlineComputedStyles).mockReturnValue(vi.fn())
    vi.mocked(imageExport.forceLightMode).mockReturnValue(vi.fn())

    const close = vi.fn()
    const { result } = renderHook(() => useExportHandlers(close))

    await act(async () => { await result.current.exportPng() })

    expect(imageExport.toPng).toHaveBeenCalledWith(el)
    expect(fs.downloadBlob).toHaveBeenCalled()
    expect(useUiStore.getState().toasts.some((t) => t.messageKey === 'menu:app.exportSuccess')).toBe(true)
    expect(close).toHaveBeenCalled()

    document.body.removeChild(el)
  })

  it('exportPng: toasts failure when toPng throws', async () => {
    const el = document.createElement('div')
    el.className = 'react-flow__viewport'
    document.body.appendChild(el)

    vi.mocked(imageExport.toPng).mockRejectedValue(new Error('canvas error'))
    vi.mocked(imageExport.inlineComputedStyles).mockReturnValue(vi.fn())
    vi.mocked(imageExport.forceLightMode).mockReturnValue(vi.fn())

    const close = vi.fn()
    const { result } = renderHook(() => useExportHandlers(close))

    await act(async () => { await result.current.exportPng() })

    expect(useUiStore.getState().toasts.some((t) => t.messageKey === 'menu:app.exportFailure')).toBe(true)
    expect(close).toHaveBeenCalled()

    document.body.removeChild(el)
  })

  it('exportSvg: toasts error when no canvas element is found', async () => {
    const close = vi.fn()
    const { result } = renderHook(() => useExportHandlers(close))

    await act(async () => { await result.current.exportSvg() })

    expect(useUiStore.getState().toasts.some((t) => t.messageKey === 'menu:app.exportFailure')).toBe(true)
    expect(close).not.toHaveBeenCalled()
  })

  it('exportSvg: runs full flow and toasts success when canvas is found', async () => {
    const el = document.createElement('div')
    el.className = 'react-flow__viewport'
    document.body.appendChild(el)

    vi.mocked(imageExport.canvasToSvg).mockResolvedValue('data:image/svg+xml;base64,abc')
    vi.mocked(imageExport.inlineComputedStyles).mockReturnValue(vi.fn())
    vi.mocked(imageExport.forceLightMode).mockReturnValue(vi.fn())

    const close = vi.fn()
    const { result } = renderHook(() => useExportHandlers(close))

    await act(async () => { await result.current.exportSvg() })

    expect(imageExport.canvasToSvg).toHaveBeenCalledWith(el)
    expect(fs.downloadBlob).toHaveBeenCalled()
    expect(useUiStore.getState().toasts.some((t) => t.messageKey === 'menu:app.exportSuccess')).toBe(true)
    expect(close).toHaveBeenCalled()

    document.body.removeChild(el)
  })

  it('exportSvg: toasts failure when canvasToSvg throws', async () => {
    const el = document.createElement('div')
    el.className = 'react-flow__viewport'
    document.body.appendChild(el)

    vi.mocked(imageExport.canvasToSvg).mockRejectedValue(new Error('svg error'))
    vi.mocked(imageExport.inlineComputedStyles).mockReturnValue(vi.fn())
    vi.mocked(imageExport.forceLightMode).mockReturnValue(vi.fn())

    const close = vi.fn()
    const { result } = renderHook(() => useExportHandlers(close))

    await act(async () => { await result.current.exportSvg() })

    expect(useUiStore.getState().toasts.some((t) => t.messageKey === 'menu:app.exportFailure')).toBe(true)
    expect(close).toHaveBeenCalled()

    document.body.removeChild(el)
  })
})
