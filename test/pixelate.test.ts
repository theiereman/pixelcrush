import { describe, expect, it } from "vitest"
import { cropRegion, pixelate } from "../src/index"
import { targetSize } from "../src/pixelate"
import { fromPixels, image, toPixels, type Rgba } from "./helpers"

const RED: Rgba = [255, 0, 0, 255]
const GREEN: Rgba = [0, 255, 0, 255]
const BLUE: Rgba = [0, 0, 255, 255]
const WHITE: Rgba = [255, 255, 255, 255]
const BLACK: Rgba = [0, 0, 0, 255]

describe("pixelate", () => {
  it("downscales four 2 × 2 blocks to their four colours exactly", () => {
    const blocks = [RED, GREEN, BLUE, WHITE]
    const source = image(4, 4, (x, y) => blocks[Math.floor(y / 2) * 2 + Math.floor(x / 2)])

    expect(toPixels(pixelate(source, { width: 2, height: 2 }))).toEqual(blocks)
  })

  it("weights uneven cells by the area they cover", () => {
    const values = [0, 30, 60, 90, 120, 150, 180, 210, 240]
    const source = fromPixels(3, 3, values.map((value): Rgba => [value, value, value, 255]))

    const result = pixelate(source, { width: 2, height: 2, crop: "none" })

    expect(Array.from(result.data)).toEqual([
      40, 40, 40, 255, 80, 80, 80, 255,
      160, 160, 160, 255, 200, 200, 200, 255,
    ])
  })

  it("weights colour by alpha", () => {
    const source = fromPixels(1, 2, [[255, 0, 0, 255], [0, 0, 255, 128]])

    // Alpha mean 191.5 rounds to 192: opaque. RGB is premultiplied by alpha.
    expect(toPixels(pixelate(source, { width: 1, height: 1, crop: "none" }))).toEqual([[170, 0, 85, 255]])
  })

  it("makes alpha binary, or keeps it with alpha keep", () => {
    const source = fromPixels(2, 1, [[10, 20, 30, 100], [40, 50, 60, 200]])
    expect(toPixels(pixelate(source, { width: 2, height: 1 }))).toEqual([[0, 0, 0, 0], [40, 50, 60, 255]])
    expect(toPixels(pixelate(source, { width: 2, height: 1, alpha: "keep" }))).toEqual([[10, 20, 30, 100], [40, 50, 60, 200]])

    const faint = fromPixels(2, 1, [[255, 0, 0, 40], [0, 0, 255, 0]])
    expect(toPixels(pixelate(faint, { width: 1, height: 1, crop: "none", alpha: "keep" }))).toEqual([[255, 0, 0, 20]])
    expect(toPixels(pixelate(faint, { width: 1, height: 1, crop: "none" }))).toEqual([[0, 0, 0, 0]])
    expect(toPixels(pixelate(fromPixels(1, 1, [[9, 9, 9, 0]]), { width: 1, height: 1, alpha: "keep" }))).toEqual([[0, 0, 0, 0]])
  })

  it("crops the centre of the source to the target ratio", () => {
    // The centre 66.7 × 100 region spans x = 16.7 to 83.3: it takes a third of
    // the red edge columns 16 and 83, all of the white 17 to 82, none of the black.
    const source = image(100, 100, (x) => (x === 16 || x === 83 ? RED : x > 16 && x < 83 ? WHITE : BLACK))

    // Each cell: 1/3 of red and 33 of white, so G and B are 255 × 33 / 33.33 = 252.
    expect(toPixels(pixelate(source, { width: 2, height: 3 }))).toEqual(Array(6).fill([255, 252, 252, 255]))
    expect(toPixels(pixelate(source, { width: 2, height: 3, crop: "none" }))).not.toEqual(Array(6).fill([255, 252, 252, 255]))
  })

  it("anchors a vertical crop in the middle by default, at the top with y 0 and at the bottom with y 1", () => {
    // A 10 × 20 region in 10 × 120: the 100 rows left over go 50 above, 50 below.
    const source = image(10, 120, (_x, y) => (y >= 50 && y < 70 ? GREEN : y >= 100 ? BLUE : BLACK))

    expect(toPixels(pixelate(source, { width: 2, height: 4 }))).toEqual(Array(8).fill(GREEN))
    expect(toPixels(pixelate(source, { width: 2, height: 4, anchor: { y: 0.5 } }))).toEqual(Array(8).fill(GREEN))
    expect(toPixels(pixelate(source, { width: 2, height: 4, anchor: { y: 0 } }))).toEqual(Array(8).fill(BLACK))
    expect(toPixels(pixelate(source, { width: 2, height: 4, anchor: { y: 1 } }))).toEqual(Array(8).fill(BLUE))
  })

  it("anchors a horizontal crop the same way, with x", () => {
    // A 20 × 10 region in 120 × 10: the 100 columns left over go 50 each side.
    const source = image(120, 10, (x) => (x >= 50 && x < 70 ? GREEN : x >= 100 ? BLUE : BLACK))

    expect(toPixels(pixelate(source, { width: 4, height: 2 }))).toEqual(Array(8).fill(GREEN))
    expect(toPixels(pixelate(source, { width: 4, height: 2, anchor: { x: 0 } }))).toEqual(Array(8).fill(BLACK))
    expect(toPixels(pixelate(source, { width: 4, height: 2, anchor: { x: 1 } }))).toEqual(Array(8).fill(BLUE))
  })

  it("gives the crop region, for drawing the crop oneself", () => {
    expect(cropRegion(600, 900, { width: 68, height: 108 })).toEqual({ x: (600 - 900 * (68 / 108)) / 2, y: 0, width: 900 * (68 / 108), height: 900 })
    expect(cropRegion(300, 600, { width: 2, height: 3 })).toEqual({ x: 0, y: (600 - 450) * 0.5, width: 300, height: 450 })
    expect(cropRegion(300, 600, { width: 2, height: 3, anchor: { y: 1 } })).toEqual({ x: 0, y: 150, width: 300, height: 450 })
    expect(cropRegion(600, 900, { width: 68, height: 108, anchor: { x: 0 } })).toEqual({ x: 0, y: 0, width: 900 * (68 / 108), height: 900 })
    expect(cropRegion(300, 600, { width: 2, height: 3, crop: "none" })).toEqual({ x: 0, y: 0, width: 300, height: 600 })
  })

  it("follows the source's ratio, cropping nothing, when one side only is given", () => {
    expect(targetSize(600, 900, { width: 64 })).toEqual({ width: 64, height: 96 })
    expect(targetSize(600, 900, { height: 90 })).toEqual({ width: 60, height: 90 })
    expect(targetSize(1000, 1, { width: 1 })).toEqual({ width: 1, height: 1 })
    expect(cropRegion(800, 400, { width: 64 })).toEqual({ x: 0, y: 0, width: 800, height: 400 })

    const source = image(10, 20, (_x, y) => (y < 10 ? GREEN : BLUE))
    expect(toPixels(pixelate(source, { width: 1 }))).toEqual([GREEN, BLUE])
    expect(toPixels(pixelate(source, { height: 2 }))).toEqual([GREEN, BLUE])
    // @ts-expect-error one side at least
    expect(() => pixelate(source, {})).toThrow(RangeError)
  })

  it("repeats the covering pixel when the source is smaller than the target", () => {
    expect(toPixels(pixelate(fromPixels(1, 1, [BLUE]), { width: 2, height: 3 }))).toEqual(Array(6).fill(BLUE))
    expect(toPixels(pixelate(fromPixels(2, 1, [RED, GREEN]), { width: 4, height: 2, crop: "none" }))).toEqual([
      RED, RED, GREEN, GREEN,
      RED, RED, GREEN, GREEN,
    ])
  })

  it("leaves the source untouched", () => {
    const source = fromPixels(2, 1, [[10, 20, 30, 100], [40, 50, 60, 200]])
    const before = Array.from(source.data)

    pixelate(source, { width: 1, height: 1 })

    expect(Array.from(source.data)).toEqual(before)
  })

  it("rejects a crop, an anchor or an alpha mode that does not exist", () => {
    const source = fromPixels(1, 1, [RED])
    // @ts-expect-error a crop that does not exist
    expect(() => pixelate(source, { width: 1, height: 1, crop: "contain" })).toThrow(RangeError)
    // @ts-expect-error the anchor is { x, y }
    expect(() => pixelate(source, { width: 1, height: 1, anchor: 0.5 })).toThrow(RangeError)
    // @ts-expect-error an alpha mode that does not exist
    expect(() => pixelate(source, { width: 1, height: 1, alpha: "soft" })).toThrow(RangeError)
  })

  it.each([-0.1, 1.1, Number.NaN])("rejects an anchor of %s on either axis", (value) => {
    expect(() => pixelate(fromPixels(1, 1, [RED]), { width: 1, height: 1, anchor: { x: value } })).toThrow(RangeError)
    expect(() => pixelate(fromPixels(1, 1, [RED]), { width: 1, height: 1, anchor: { y: value } })).toThrow(RangeError)
  })

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])("rejects a target size of %s", (size) => {
    const source = fromPixels(1, 1, [RED])

    expect(() => pixelate(source, { width: size, height: 1 })).toThrow(RangeError)
    expect(() => pixelate(source, { width: 1, height: size })).toThrow(RangeError)
    expect(() => pixelate(source, { width: size })).toThrow(RangeError)
  })

  it("rejects a source of bad size or data length", () => {
    expect(() => pixelate({ width: 0, height: 1, data: new Uint8ClampedArray(0) }, { width: 1, height: 1 })).toThrow(RangeError)
    expect(() => pixelate({ width: 2.5, height: 1, data: new Uint8ClampedArray(10) }, { width: 1, height: 1 })).toThrow(RangeError)
    expect(() => pixelate({ width: 2, height: 2, data: new Uint8ClampedArray(15) }, { width: 1, height: 1 })).toThrow(RangeError)
  })
})
