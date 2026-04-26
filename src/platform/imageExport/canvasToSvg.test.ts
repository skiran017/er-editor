import { describe, it, expect, vi, beforeEach } from 'vitest'
import { canvasToSvg } from './canvasToSvg'

vi.mock('html-to-image', async () => ({
  toSvg: vi.fn(async () => 'data:image/svg+xml;charset=utf-8,MOCK'),
}))

beforeEach(() => { vi.clearAllMocks() })

describe('canvasToSvg', () => {
  it('returns the data URL produced by html-to-image.toSvg', async () => {
    const el = document.createElement('div')
    await expect(canvasToSvg(el)).resolves.toBe('data:image/svg+xml;charset=utf-8,MOCK')
  })

  it('forwards backgroundColor and defaults to white', async () => {
    const { toSvg: mockToSvg } = (await import('html-to-image')) as unknown as { toSvg: ReturnType<typeof vi.fn> }
    const el = document.createElement('div')

    await canvasToSvg(el, { backgroundColor: '#abc' })
    expect(mockToSvg).toHaveBeenLastCalledWith(el, expect.objectContaining({ backgroundColor: '#abc' }))

    await canvasToSvg(el)
    expect(mockToSvg).toHaveBeenLastCalledWith(el, expect.objectContaining({ backgroundColor: 'white' }))
  })
})
