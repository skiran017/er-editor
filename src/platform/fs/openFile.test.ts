import { describe, it, expect, vi, afterEach } from 'vitest'
import { openFile } from './openFile'

afterEach(() => { vi.restoreAllMocks() })

describe('openFile', () => {
  it('resolves with the File when the invisible input reports change', async () => {
    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' })

    // Intercept the input the helper creates so we can drive its `change` event.
    const original = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = original(tag) as HTMLElement
      if (tag === 'input') {
        queueMicrotask(() => {
          Object.defineProperty(el, 'files', { value: [file], configurable: true })
          el.dispatchEvent(new Event('change'))
        })
      }
      return el as never
    })

    await expect(openFile({ accept: '.txt' })).resolves.toStrictEqual(file)
  })

  it('resolves with null when the user cancels (no files)', async () => {
    const original = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = original(tag) as HTMLElement
      if (tag === 'input') {
        queueMicrotask(() => {
          Object.defineProperty(el, 'files', { value: [], configurable: true })
          el.dispatchEvent(new Event('change'))
        })
      }
      return el as never
    })

    await expect(openFile({ accept: '.txt' })).resolves.toBeNull()
  })
})
