const XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
const SVG_NS = 'http://www.w3.org/2000/svg'

/**
 * Serialises a live `<svg>` DOM node to a standalone XML string suitable for
 * saving to disk or feeding to `downloadBlob`. Clones the input so the live
 * DOM is never mutated; ensures the root element carries an `xmlns` so the
 * result opens cleanly in browsers and SVG editors regardless of how the
 * caller constructed the element.
 */
export const toSvg = (svg: SVGElement): string => {
  // Clone so we can mutate (adding xmlns) without touching the live DOM.
  const clone = svg.cloneNode(true) as SVGElement
  // XMLSerializer emits xmlns based on `namespaceURI`. If the element wasn't
  // created via the SVG namespace (e.g., parsed from an HTML string where
  // inline SVGs can lose their namespace), inject it as a literal attribute.
  if (clone.namespaceURI !== SVG_NS) {
    clone.setAttribute('xmlns', SVG_NS)
  }
  return XML_DECL + new XMLSerializer().serializeToString(clone)
}
