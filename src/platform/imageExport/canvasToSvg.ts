import { toSvg as htmlToImageToSvg } from 'html-to-image'

export interface CanvasToSvgOptions {
  /** CSS colour painted behind the canvas. Default: 'white'. */
  readonly backgroundColor?: string
}

/**
 * Rasterise the live React Flow canvas DOM (HTML + SVG mix) to an SVG
 * data URL via html-to-image. The wrapped library uses `<foreignObject>`
 * to embed HTML nodes inside SVG, so the result faithfully reproduces
 * the canvas including custom React node components.
 *
 * Different from the standalone-SVG serialiser `toSvg(svg: SVGElement)`,
 * which is a pure DOM serialiser for elements that are already SVG roots.
 */
export const canvasToSvg = (el: HTMLElement, opts: CanvasToSvgOptions = {}): Promise<string> =>
  htmlToImageToSvg(el, { backgroundColor: opts.backgroundColor ?? 'white' })
