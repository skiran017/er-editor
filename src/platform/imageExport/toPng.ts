import { toPng as htmlToImageToPng } from 'html-to-image'

export interface ToPngOptions {
  /** CSS colour painted behind the canvas. Default: 'white'. */
  readonly backgroundColor?: string
  /** Pixel density multiplier. Default: html-to-image's own `window.devicePixelRatio` fallback. */
  readonly pixelRatio?: number
}

export const toPng = (el: HTMLElement, opts: ToPngOptions = {}): Promise<string> =>
  htmlToImageToPng(el, {
    backgroundColor: opts.backgroundColor ?? 'white',
    ...(opts.pixelRatio !== undefined && { pixelRatio: opts.pixelRatio }),
  })
