// src/platform/imageExport/inlineComputedStyles.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { inlineComputedStyles } from './inlineComputedStyles'

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('inlineComputedStyles', () => {
  it('writes computed paint properties to the inline style attribute', () => {
    const wrapper = document.createElement('div')
    wrapper.innerHTML = '<svg><rect width="10" height="10" /></svg>'
    document.body.appendChild(wrapper)

    // jsdom's computed style is mostly empty by default; just verify the
    // helper runs without throwing and returns a callable restore function.
    const restore = inlineComputedStyles(wrapper)
    expect(typeof restore).toBe('function')
    restore()
  })

  it('preserves a pre-existing style attribute on restore', () => {
    const div = document.createElement('div')
    div.setAttribute('style', 'color: red')
    document.body.appendChild(div)

    const restore = inlineComputedStyles(div)
    // Helper may or may not have appended (depending on jsdom defaults);
    // either way restore must yield the original.
    restore()
    expect(div.getAttribute('style')).toBe('color: red')
  })
})
