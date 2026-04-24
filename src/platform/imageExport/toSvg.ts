const XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n'
const SVG_NS = 'http://www.w3.org/2000/svg'

export const toSvg = (svg: SVGElement): string => {
  // Clone so we can mutate (adding xmlns) without touching the live DOM.
  const clone = svg.cloneNode(true) as SVGElement
  if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', SVG_NS)
  return XML_DECL + new XMLSerializer().serializeToString(clone)
}
