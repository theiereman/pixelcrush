import { pixelate, type PixelateOptions } from "./pixelate"
import { assertColors, type Pixels } from "./pixels"
import { DEFAULT_COLORS, quantize, type Quantized } from "./quantize"

export type FilterOptions = PixelateOptions & { width: number; height: number; colors?: number }

/** Pixelates `source` to `width × height`, then reduces it to `colors` colours (32 by default). */
export function filter(source: Pixels, { width, height, colors = DEFAULT_COLORS, ...options }: FilterOptions): Quantized {
  assertColors(colors)
  return quantize(pixelate(source, width, height, options), colors)
}
