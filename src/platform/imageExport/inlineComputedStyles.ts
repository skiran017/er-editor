// src/platform/imageExport/inlineComputedStyles.ts

const PROPS = [
  'fill',
  'stroke',
  'stroke-width',
  'stroke-dasharray',
  'color',
  'background-color',
  'border-color',
  'font-family',
  'font-size',
  'font-weight',
] as const

const collectInlineStyle = (el: Element): string => {
  const cs = getComputedStyle(el)
  const declarations: string[] = []
  for (const p of PROPS) {
    const value = cs.getPropertyValue(p)
    if (value && value !== 'none' && value !== '') {
      declarations.push(`${p}: ${value}`)
    }
  }
  return declarations.join('; ')
}

/**
 * Walks `root` and every descendant. For each element, reads the
 * computed style for paint-related CSS properties and appends them
 * to the element's inline `style` attribute. Returns a callback that
 * restores every original `style` attribute when invoked.
 *
 * Why this exists: `html-to-image` rasterises into a `<canvas>` via a
 * `<foreignObject>` SVG. When fills/strokes are declared by external
 * stylesheets that use modern CSS color functions (Tailwind v4's
 * `oklch()`), the canvas painter does not resolve them — shapes render
 * as solid black. Inlining the BROWSER-RESOLVED computed values (which
 * `getComputedStyle` returns as `rgb(...)` strings on every browser we
 * support) sidesteps the issue without touching the source components.
 */
export const inlineComputedStyles = (root: Element): (() => void) => {
  const elements: Element[] = [root, ...Array.from(root.querySelectorAll('*'))]
  const restorations: Array<() => void> = []

  for (const el of elements) {
    const inlined = collectInlineStyle(el)
    if (!inlined) continue

    const prev = el.getAttribute('style')
    const next = prev ? `${prev}; ${inlined}` : inlined
    el.setAttribute('style', next)

    restorations.push(() => {
      if (prev !== null) el.setAttribute('style', prev)
      else el.removeAttribute('style')
    })
  }

  return () => {
    for (const restore of restorations) restore()
  }
}
