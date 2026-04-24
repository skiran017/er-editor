import { toPng as htmlToImageToPng } from 'html-to-image'

export interface ToPngOptions {
  /** CSS colour painted behind the canvas. Default: 'white'. */
  readonly backgroundColor?: string
  /** Pixel density multiplier. Default: window.devicePixelRatio or 1. */
  readonly pixelRatio?: number
}

export const toPng = (el: HTMLElement, opts: ToPngOptions = {}): Promise<string> =>
  htmlToImageToPng(el, {
    backgroundColor: opts.backgroundColor ?? 'white',
    pixelRatio:
      opts.pixelRatio ?? (typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1),
  })
