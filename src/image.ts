import { downscale, type CreateSurface, type DrawContext, type Surface } from "./downscale"
import { filter, type FilterOptions } from "./filter"
import type { Pixels } from "./pixels"
import type { Quantized } from "./quantize"

/**
 * A decoded `<img>`, by what is used of it. The DOM element types are not
 * named, so the types load without the DOM lib, in a worker's tsconfig.
 */
export type ImageElement = CanvasImageSource & { readonly naturalWidth: number; readonly naturalHeight: number }

/** A `<canvas>`, by what is used of it. */
export type CanvasElement = CanvasImageSource & { width: number; height: number; getContext(contextId: "2d"): unknown }

/** Something the browser can draw whose size is known: a decoded image, a canvas or an `ImageBitmap`. */
export type ImageSource = ImageBitmap | OffscreenCanvas | ImageElement | CanvasElement

/** What reading pixels back needs of a 2D context. */
export type ReadContext = DrawContext & Pick<OffscreenCanvasRenderingContext2D, "getImageData">

/** A `<canvas>` or `OffscreenCanvas` to draw on, by what is used of it. */
export type CanvasTarget = { width: number; height: number; getContext(contextId: "2d"): Pick<OffscreenCanvasRenderingContext2D, "putImageData"> | null }

export type PixelateImageOptions = FilterOptions & {
  /** Makes the scratch canvases; defaults to an `OffscreenCanvas`, else a `<canvas>`. */
  createSurface?: CreateSurface<ReadContext>
}

/** The size of an image in its own pixels. */
export function sourceSize(source: ImageSource): { width: number; height: number } {
  if ("naturalWidth" in source) return { width: source.naturalWidth, height: source.naturalHeight }
  return { width: source.width, height: source.height }
}

/**
 * Pixelates a browser image to `width × height` and reduces it to `colors`
 * colours: `filter`, from a decoded image rather than from RGBA data. The
 * image is cropped, halved on scratch canvases until it is within twice the
 * target size, then read back and averaged exactly.
 *
 * The halving is the browser's resampling, so the result depends on the
 * browser, and can differ slightly between an `<img>` and an `ImageBitmap` of
 * the same image. For a result that depends on nothing else, read the pixels
 * yourself and call `filter`.
 *
 * The scratch canvases must stay readable: an image from another origin that
 * did not allow CORS taints them and `getImageData` throws a `SecurityError`.
 */
export function pixelateImage(source: ImageSource, options: PixelateImageOptions): Quantized {
  const { createSurface = defaultSurface, ...filterOptions } = options
  const { width, height, crop = "cover", anchor } = filterOptions
  const size = sourceSize(source)

  if (crop === "none") {
    const surface = createSurface(size.width, size.height)
    if (!surface) throw new Error("No 2D context on a scratch canvas")
    surface.context.drawImage(source, 0, 0, size.width, size.height, 0, 0, size.width, size.height)
    return filter(read(surface, size.width, size.height), filterOptions)
  }

  const last = downscale(source, size.width, size.height, width, height, createSurface, anchor)
  if (!last) throw new Error("No 2D context on a scratch canvas")
  // The crop is done: the rest is the exact average of what is left.
  return filter(read(last, last.width, last.height), { ...filterOptions, crop: "none" })
}

/** Draws `pixels` on `canvas`, resizing the canvas to the image. */
export function drawPixels(canvas: CanvasTarget, pixels: Pixels): void {
  const context = canvas.getContext("2d")
  if (!context) throw new Error("No 2D context on the target canvas")
  canvas.width = pixels.width
  canvas.height = pixels.height
  context.putImageData(new ImageData(pixels.data, pixels.width, pixels.height), 0, 0)
}

function read(surface: Surface<ReadContext>, width: number, height: number): Pixels {
  const { data } = surface.context.getImageData(0, 0, width, height)
  return { width, height, data: new Uint8ClampedArray(data) }
}

function defaultSurface(width: number, height: number): Surface<ReadContext> | null {
  const canvas = typeof OffscreenCanvas === "function" ? new OffscreenCanvas(width, height) : document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext("2d", { willReadFrequently: true }) as ReadContext | null
  return context ? { canvas, context } : null
}
