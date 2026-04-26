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
    expect(out.startsWith('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>')).toBe(true)
    expect(out).toContain('viewBox="0 0 10 10"')
    expect(out).toContain('<rect')
  })

  it('emits exactly one xmlns declaration for namespace-aware SVG input', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    const out = toSvg(svg)
    const matches = out.match(/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/g) ?? []
    expect(matches).toHaveLength(1)
  })

  it('injects xmlns when the input SVG has no SVG namespace', () => {
    // `createElement` (no NS) produces an element in the HTML namespace;
    // `XMLSerializer` will not emit an SVG xmlns for it, so the guard fires.
    const svg = document.createElement('svg') as unknown as SVGElement
    const out = toSvg(svg)
    expect(out).toContain('xmlns="http://www.w3.org/2000/svg"')
  })
})
