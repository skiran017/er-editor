import { describe, it, expect, vi, afterEach } from 'vitest'
import { downloadBlob } from './downloadBlob'

afterEach(() => { vi.restoreAllMocks() })

describe('downloadBlob', () => {
  it('creates a blob URL, clicks an anchor with the filename, and revokes the URL', () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:mock-url')
    const revokeObjectURL = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true })
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true })

    const clicks: HTMLAnchorElement[] = []
    const original = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = original(tag) as HTMLElement
      if (tag === 'a') {
        const anchor = el as HTMLAnchorElement
        anchor.click = () => { clicks.push(anchor) }
      }
      return el as never
    })

    downloadBlob(new Blob(['payload'], { type: 'application/json' }), 'diagram.json')

    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(clicks).toHaveLength(1)
    expect(clicks[0]!.download).toBe('diagram.json')
    expect(clicks[0]!.href).toBe('blob:mock-url')
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })
})
