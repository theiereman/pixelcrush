import { filter, type FilterOptions } from "./filter"
import type { Pixels } from "./pixels"
import type { Quantized } from "./quantize"

// The DOM element types are not named here, by what is used of them instead,
// so the types load with the WebWorker lib as well as with the DOM lib.

/** A decoded `<img>`. */
type ImageElement = CanvasImageSource & { readonly naturalWidth: number; readonly naturalHeight: number }

/** A `<video>` showing a frame. */
type VideoElement = CanvasImageSource & { readonly videoWidth: number; readonly videoHeight: number }

/** A `<canvas>`. */
type CanvasElement = CanvasImageSource & { width: number; height: number; getContext(contextId: "2d"): unknown }

/** Something the browser can draw whose size is known: a decoded image, a video, a canvas or an `ImageBitmap`. */
export type ImageSource = ImageBitmap | OffscreenCanvas | ImageElement | VideoElement | CanvasElement

/** A `<canvas>` or `OffscreenCanvas` to draw on. */
export type CanvasTarget = { width: number; height: number; getContext(contextId: "2d"): Pick<OffscreenCanvasRenderingContext2D, "putImageData"> | null }

type ReadContext = Pick<OffscreenCanvasRenderingContext2D, "drawImage" | "getImageData">

/** The size of an image in its own pixels: 0 × 0 for an image not decoded yet. */
export function sourceSize(source: ImageSource): { width: number; height: number } {
  if ("naturalWidth" in source) return { width: source.naturalWidth, height: source.naturalHeight }
  if ("videoWidth" in source) return { width: source.videoWidth, height: source.videoHeight }
  return { width: source.width, height: source.height }
}

/**
 * The RGBA pixels of a browser image, read at its size through a scratch
 * canvas (an `OffscreenCanvas` where there is one, else a `<canvas>`). Throws
 * when the image is not decoded yet, and a `SecurityError` when it comes from
 * another origin that did not allow CORS, which taints the scratch canvas.
 */
export function readPixels(source: ImageSource): Pixels {
  const { width, height } = sourceSize(source)
  if (width === 0 || height === 0) throw new Error("The image has no pixels yet: decode it first (await image.decode()), or wait for a video's first frame")
  const canvas = typeof OffscreenCanvas === "function" ? new OffscreenCanvas(width, height) : document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext("2d", { willReadFrequently: true }) as ReadContext | null
  if (!context) throw new Error("No 2D context on a scratch canvas")
  context.drawImage(source, 0, 0)
  return { width, height, data: context.getImageData(0, 0, width, height).data }
}

/** `filter` on a browser image: `readPixels`, then `filter`. */
export function pixelateImage(source: ImageSource, options: FilterOptions): Quantized {
  return filter(readPixels(source), options)
}

/** Draws `pixels` on `canvas`, resizing the canvas to the image. */
export function drawPixels(canvas: CanvasTarget, pixels: Pixels): void {
  const context = canvas.getContext("2d")
  if (!context) throw new Error("No 2D context on the target canvas")
  canvas.width = pixels.width
  canvas.height = pixels.height
  context.putImageData(new ImageData(pixels.data as Uint8ClampedArray<ArrayBuffer>, pixels.width, pixels.height), 0, 0)
}
