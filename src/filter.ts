import { pixelate, type PixelateOptions } from "./pixelate"
import { assertColors, type Pixels } from "./pixels"
import { DEFAULT_COLORS, quantize, type Quantized } from "./quantize"

export type FilterOptions = PixelateOptions & { colors?: number }

/** Pixelates `source` to the target size, then reduces it to `colors` colours (32 by default). */
export function filter(source: Pixels, options: FilterOptions): Quantized {
  const { colors = DEFAULT_COLORS } = options
  assertColors(colors)
  return quantize(pixelate(source, options), colors)
}
