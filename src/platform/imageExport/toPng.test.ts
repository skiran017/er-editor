import { describe, it, expect, vi } from 'vitest'
import { toPng } from './toPng'

vi.mock('html-to-image', async () => ({
  toPng: vi.fn(async () => 'data:image/png;base64,MOCK'),
}))

describe('toPng', () => {
  it('returns the data URL produced by html-to-image.toPng', async () => {
    const el = document.createElement('div')
    await expect(toPng(el)).resolves.toBe('data:image/png;base64,MOCK')
  })

  it('passes backgroundColor + pixelRatio options through', async () => {
    const { toPng: mockHtmlToImage } = (await import('html-to-image')) as unknown as {
      toPng: ReturnType<typeof vi.fn>
    }
    mockHtmlToImage.mockClear()
    const el = document.createElement('div')

    await toPng(el, { backgroundColor: '#112233', pixelRatio: 2 })

    expect(mockHtmlToImage).toHaveBeenCalledWith(el, expect.objectContaining({
      backgroundColor: '#112233',
      pixelRatio: 2,
    }))
  })

  it('defaults backgroundColor to white and pixelRatio to window.devicePixelRatio', async () => {
    const { toPng: mockHtmlToImage } = (await import('html-to-image')) as unknown as {
      toPng: ReturnType<typeof vi.fn>
    }
    mockHtmlToImage.mockClear()
    const el = document.createElement('div')

    await toPng(el)

    expect(mockHtmlToImage).toHaveBeenCalledWith(el, expect.objectContaining({
      backgroundColor: 'white',
    }))
    const callOpts = mockHtmlToImage.mock.calls[0]![1] as { pixelRatio: number }
    expect(typeof callOpts.pixelRatio).toBe('number')
    expect(callOpts.pixelRatio).toBeGreaterThan(0)
  })
})
