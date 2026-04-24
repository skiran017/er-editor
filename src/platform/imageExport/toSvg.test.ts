import { describe, it, expect } from 'vitest'
import { toSvg } from './toSvg'

describe('toSvg', () => {
  it('returns the XML declaration + serialised SVG', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('viewBox', '0 0 10 10')
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    rect.setAttribute('width', '10')
    rect.setAttribute('height', '10')
    svg.appendChild(rect)

    const out = toSvg(svg)
    expect(out.startsWith('<?xml version="1.0"')).toBe(true)
    expect(out).toContain('viewBox="0 0 10 10"')
    expect(out).toContain('<rect')
  })

  it('injects the xmlns attribute if missing', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    const out = toSvg(svg)
    expect(out).toContain('xmlns="http://www.w3.org/2000/svg"')
  })
})
