import { assertAnchor, assertPixels, assertSize, type Pixels } from "./pixels"

/** `"cover"` crops the source to the target ratio; `"none"` stretches it. */
export type Crop = "cover" | "none"

/**
 * Where a `"cover"` crop sits on the axis it cuts, 0 (left or top) to 1
 * (right or bottom); the middle, 0.5, on both axes by default.
 */
export type Anchor = { x?: number; y?: number }

/** `"binary"` (the default) makes every pixel opaque or transparent; `"keep"` keeps the averaged alpha. */
export type Alpha = "binary" | "keep"

/** The target size, in pixels. With one side only, the other follows the source's ratio. */
export type TargetSize = { width: number; height?: number } | { width?: number; height: number }

export type CropOptions = TargetSize & { crop?: Crop; anchor?: Anchor }

export type PixelateOptions = CropOptions & { alpha?: Alpha }

/** A rectangle of the source, in source pixels (not rounded). */
export type Region = { x: number; y: number; width: number; height: number }

/** One source index and the share of it a target pixel covers. */
type Tap = { index: number; weight: number }

/**
 * Resizes `source` to the target size. Each target pixel is the area-weighted
 * mean of the source pixels it covers, with RGB weighted by alpha. On an axis
 * where the source is smaller than the target, the covering pixel is used.
 * Alpha is then made binary unless `alpha` is `"keep"`: 128 or more becomes
 * 255, less becomes 0 (RGB 0).
 */
export function pixelate(source: Pixels, options: PixelateOptions): Pixels {
  assertPixels(source)
  const { alpha: alphaMode = "binary" } = options
  if (alphaMode !== "binary" && alphaMode !== "keep") throw new RangeError(`alpha must be "binary" or "keep", got ${String(alphaMode)}`)
  const { width, height } = targetSize(source.width, source.height, options)
  const region = cropRegion(source.width, source.height, options)
  const columns = taps(source.width, region.x, region.width, width)
  const rows = taps(source.height, region.y, region.height, height)

  const input = source.data
  const output = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let total = 0
      let alpha = 0
      let red = 0
      let green = 0
      let blue = 0
      for (const row of rows[y]) {
        for (const column of columns[x]) {
          const weight = row.weight * column.weight
          const offset = (row.index * source.width + column.index) * 4
          const weightedAlpha = weight * input[offset + 3]
          total += weight
          alpha += weightedAlpha
          red += weightedAlpha * input[offset]
          green += weightedAlpha * input[offset + 1]
          blue += weightedAlpha * input[offset + 2]
        }
      }
      const offset = (y * width + x) * 4
      const meanAlpha = Math.round(alpha / total)
      if (alphaMode === "keep" ? meanAlpha > 0 : meanAlpha >= 128) {
        output[offset] = Math.round(red / alpha)
        output[offset + 1] = Math.round(green / alpha)
        output[offset + 2] = Math.round(blue / alpha)
        output[offset + 3] = alphaMode === "keep" ? meanAlpha : 255
      }
    }
  }
  return { width, height, data: output }
}

/**
 * The part of a `sourceWidth × sourceHeight` image that the target shows.
 * `"cover"` keeps the largest region of the target's ratio, placed by
 * `anchor`; `"none"` keeps the whole source.
 */
export function cropRegion(sourceWidth: number, sourceHeight: number, options: CropOptions): Region {
  assertSize("source width", sourceWidth)
  assertSize("source height", sourceHeight)
  const { width, height } = targetSize(sourceWidth, sourceHeight, options)
  const { crop = "cover", anchor = {} } = options
  if (crop !== "cover" && crop !== "none") throw new RangeError(`crop must be "cover" or "none", got ${String(crop)}`)
  if (typeof anchor !== "object" || anchor === null) throw new RangeError(`anchor must be { x, y }, got ${String(anchor)}`)
  const { x: anchorX = 0.5, y: anchorY = 0.5 } = anchor
  assertAnchor("anchor.x", anchorX)
  assertAnchor("anchor.y", anchorY)
  if (crop === "none") return { x: 0, y: 0, width: sourceWidth, height: sourceHeight }

  const targetRatio = width / height
  if (sourceWidth / sourceHeight > targetRatio) {
    const regionWidth = sourceHeight * targetRatio
    return { x: (sourceWidth - regionWidth) * anchorX, y: 0, width: regionWidth, height: sourceHeight }
  }
  const regionHeight = sourceWidth / targetRatio
  return { x: 0, y: (sourceHeight - regionHeight) * anchorY, width: sourceWidth, height: regionHeight }
}

/** The target size in full: a missing side follows the source's ratio. */
export function targetSize(sourceWidth: number, sourceHeight: number, { width, height }: TargetSize): { width: number; height: number } {
  if (width !== undefined) assertSize("width", width)
  if (height !== undefined) assertSize("height", height)
  if (width !== undefined && height !== undefined) return { width, height }
  if (width !== undefined) return { width, height: Math.max(1, Math.round((width * sourceHeight) / sourceWidth)) }
  if (height !== undefined) return { width: Math.max(1, Math.round((height * sourceWidth) / sourceHeight)), height }
  throw new RangeError("width or height is required")
}

/** For each of `count` target cells, the source indices it covers along one axis. */
function taps(sourceLength: number, start: number, length: number, count: number): Tap[][] {
  const step = length / count
  const result: Tap[][] = []
  for (let cell = 0; cell < count; cell++) {
    const from = start + cell * step
    const to = from + step
    if (step < 1) {
      result.push([{ index: clamp(Math.floor((from + to) / 2), sourceLength), weight: 1 }])
      continue
    }
    const cellTaps: Tap[] = []
    for (let index = Math.floor(from); index < to; index++) {
      const weight = Math.min(to, index + 1) - Math.max(from, index)
      if (weight > 1e-9) cellTaps.push({ index: clamp(index, sourceLength), weight })
    }
    result.push(cellTaps)
  }
  return result
}

function clamp(index: number, length: number): number {
  return Math.min(Math.max(index, 0), length - 1)
}
