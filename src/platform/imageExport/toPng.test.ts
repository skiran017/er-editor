import { describe, it, expect, vi, beforeEach } from 'vitest'
import { toPng } from './toPng'

vi.mock('html-to-image', async () => ({
  toPng: vi.fn(async () => 'data:image/png;base64,MOCK'),
}))

describe('toPng', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns the data URL produced by html-to-image.toPng', async () => {
    const el = document.createElement('div')
    await expect(toPng(el)).resolves.toBe('data:image/png;base64,MOCK')
  })

  it('passes backgroundColor + pixelRatio options through', async () => {
    const { toPng: mockHtmlToImage } = (await import('html-to-image')) as unknown as {
      toPng: ReturnType<typeof vi.fn>
    }
    const el = document.createElement('div')

    await toPng(el, { backgroundColor: '#112233', pixelRatio: 2 })

    expect(mockHtmlToImage).toHaveBeenCalledWith(el, expect.objectContaining({
      backgroundColor: '#112233',
      pixelRatio: 2,
    }))
  })

  it('defaults backgroundColor to white and lets html-to-image own pixelRatio', async () => {
    const { toPng: mockHtmlToImage } = (await import('html-to-image')) as unknown as {
      toPng: ReturnType<typeof vi.fn>
    }
    const el = document.createElement('div')

    await toPng(el)

    expect(mockHtmlToImage).toHaveBeenCalledWith(el, expect.objectContaining({
      backgroundColor: 'white',
    }))
    const callOpts = mockHtmlToImage.mock.calls[0]![1] as Record<string, unknown>
    expect('pixelRatio' in callOpts).toBe(false)
  })
})
