import { describe, expect, it } from "vitest"
import { downscale, halvingSizes, type Surface } from "../src/downscale"
import { FakeSurface } from "./fakes"
import { image } from "./helpers"

describe("halvingSizes", () => {
  it("halves a region until it is within twice the target size", () => {
    // A 600 × 900 image cropped to 68 × 108 keeps 566.7 × 900.
    expect(halvingSizes(900 * (68 / 108), 900, 68, 108)).toEqual([
      { width: 283, height: 450 },
      { width: 142, height: 225 },
      { width: 71, height: 113 },
    ])
  })

  it("keeps a region already within twice the target size in one step, even under the target size", () => {
    expect(halvingSizes(120, 180, 80, 120)).toEqual([{ width: 120, height: 180 }])
    expect(halvingSizes(40, 60, 80, 120)).toEqual([{ width: 40, height: 60 }])
  })

  it("halves each axis on its own, leaving one already within twice the target alone", () => {
    expect(halvingSizes(40, 600, 80, 120)).toEqual([{ width: 40, height: 300 }, { width: 40, height: 150 }])
    expect(halvingSizes(0.4, 0.4, 1, 1)).toEqual([{ width: 1, height: 1 }])
  })
})

describe("downscale", () => {
  it("draws the crop on the first surface and each step from the one before", () => {
    const surfaces: FakeSurface[] = []
    const source = new FakeSurface(600, 900)
    source.pixels = image(600, 900, () => [10, 20, 30, 255])

    const last = downscale(source as unknown as CanvasImageSource, 600, 900, 68, 108, (width, height) => {
      const surface = new FakeSurface(width, height)
      surfaces.push(surface)
      return surface as unknown as Surface
    })

    expect(surfaces.map(({ width, height }) => [width, height])).toEqual([[283, 450], [142, 225], [71, 113]])
    expect(surfaces[0].context.draws[0].source).toBe(source)
    expect(surfaces[1].context.draws[0]).toEqual({ source: surfaces[0], args: [0, 0, 283, 450, 0, 0, 142, 225] })
    expect(last).toMatchObject({ canvas: surfaces[2], width: 71, height: 113 })
  })

  it("answers null when a surface has no 2D context", () => {
    expect(downscale({} as CanvasImageSource, 600, 900, 68, 108, () => null)).toBeNull()
  })
})
