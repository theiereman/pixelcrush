import { cropRegion, type Anchor } from "./pixelate"

/**
 * What the downscale needs of a 2D context, on a canvas or an `OffscreenCanvas`.
 * Named through `OffscreenCanvasRenderingContext2D`, which the WebWorker lib has
 * too, so the types load with the DOM lib or with the WebWorker lib.
 */
export type DrawContext = Pick<OffscreenCanvasRenderingContext2D, "drawImage" | "imageSmoothingEnabled" | "imageSmoothingQuality">

/** A scratch canvas and its 2D context. */
export type Surface<C extends DrawContext = DrawContext> = { canvas: CanvasImageSource; context: C }

/** Makes a scratch surface, or `null` when the browser gives no 2D context. */
export type CreateSurface<C extends DrawContext = DrawContext> = (width: number, height: number) => Surface<C> | null

export type Size = { width: number; height: number }

/**
 * The sizes a `regionWidth × regionHeight` region goes through on its way to
 * `width × height`: each axis is halved while above twice the target, so each
 * browser resampling averages at most about four pixels into one, and the last
 * size is within 2× the target on both axes. An axis already at or under the
 * target is left as it is: the exact step then repeats the covering pixel, as
 * `pixelate` does.
 */
export function halvingSizes(regionWidth: number, regionHeight: number, width: number, height: number): Size[] {
  const sizes: Size[] = []
  let currentWidth = regionWidth
  let currentHeight = regionHeight
  const above = () => currentWidth > width * 2 || currentHeight > height * 2
  do {
    if (currentWidth > width * 2) currentWidth /= 2
    if (currentHeight > height * 2) currentHeight /= 2
    sizes.push({ width: Math.max(1, Math.round(currentWidth)), height: Math.max(1, Math.round(currentHeight)) })
  } while (above())
  return sizes
}

/**
 * Crops `source` (placed by `anchor`) to the ratio of `width × height` and
 * halves it on scratch surfaces until it is within 2× that size. Returns the
 * last surface and its size, or `null` when a surface has no 2D context. The
 * caller makes the final, exact step.
 */
export function downscale<C extends DrawContext>(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  width: number,
  height: number,
  createSurface: CreateSurface<C>,
  anchor?: Anchor,
): (Surface<C> & Size) | null {
  const region = cropRegion(sourceWidth, sourceHeight, width, height, { anchor })
  let previous: (Surface<C> & Size) | null = null
  for (const size of halvingSizes(region.width, region.height, width, height)) {
    const surface = createSurface(size.width, size.height)
    if (!surface) return null
    surface.context.imageSmoothingEnabled = true
    surface.context.imageSmoothingQuality = "high"
    if (previous) {
      surface.context.drawImage(previous.canvas, 0, 0, previous.width, previous.height, 0, 0, size.width, size.height)
    } else {
      surface.context.drawImage(source, region.x, region.y, region.width, region.height, 0, 0, size.width, size.height)
    }
    previous = { ...surface, ...size }
  }
  return previous
}
