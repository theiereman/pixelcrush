import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { drawPixels, filter, pixelateImage, readPixels, sourceSize, type Pixels } from "../src/index"
import { FakeCanvas, FakeImageData } from "./fakes"
import { image, toPixels } from "./helpers"

const RED: [number, number, number, number] = [200, 0, 0, 255]
const BLUE: [number, number, number, number] = [0, 0, 200, 255]

/** A decoded `<img>` holding pixels. */
class FakeImage {
  constructor(readonly naturalWidth: number, readonly naturalHeight: number, readonly pixels: Pixels) {}
}

const decoded = (pixels: Pixels) => new FakeImage(pixels.width, pixels.height, pixels) as unknown as HTMLImageElement

beforeEach(() => {
  FakeCanvas.made.length = 0
  vi.stubGlobal("OffscreenCanvas", FakeCanvas)
  vi.stubGlobal("ImageData", FakeImageData)
})

afterEach(() => vi.unstubAllGlobals())

describe("sourceSize", () => {
  it("reads the natural size of an image, the video size of a video, and the size of a canvas or bitmap", () => {
    expect(sourceSize({ naturalWidth: 300, naturalHeight: 450, width: 1, height: 1 } as unknown as HTMLImageElement)).toEqual({ width: 300, height: 450 })
    expect(sourceSize({ videoWidth: 640, videoHeight: 360, width: 1, height: 1 } as unknown as HTMLVideoElement)).toEqual({ width: 640, height: 360 })
    expect(sourceSize({ width: 8, height: 6 } as unknown as ImageBitmap)).toEqual({ width: 8, height: 6 })
  })
})

describe("readPixels", () => {
  it("draws the image once, at its size, on an OffscreenCanvas made for reading, and reads it back", () => {
    const source = decoded(image(4, 2, (x) => (x < 2 ? RED : BLUE)))

    const pixels = readPixels(source)

    expect(pixels).toEqual({ width: 4, height: 2, data: (source as unknown as FakeImage).pixels.data })
    expect(FakeCanvas.made.map((canvas) => [canvas.width, canvas.height, canvas.options])).toEqual([[4, 2, { willReadFrequently: true }]])
    expect(FakeCanvas.made[0].context.draws).toEqual([{ source, args: [0, 0] }])
  })

  it("draws on a <canvas> element where there is no OffscreenCanvas", () => {
    vi.stubGlobal("OffscreenCanvas", undefined)
    vi.stubGlobal("document", { createElement: (tag: string) => (tag === "canvas" ? new FakeCanvas(0, 0) : null) })

    expect(toPixels(readPixels(decoded(image(2, 1, () => RED))))).toEqual([RED, RED])
    expect(FakeCanvas.made.map((canvas) => [canvas.width, canvas.height])).toEqual([[2, 1]])
  })

  it("refuses an image that is not decoded yet", () => {
    expect(() => readPixels(new FakeImage(0, 0, image(1, 1, () => RED)) as unknown as HTMLImageElement)).toThrow("decode")
    expect(FakeCanvas.made).toHaveLength(0)
  })

  it("fails clearly without a 2D context", () => {
    vi.stubGlobal("OffscreenCanvas", class { getContext() { return null } })
    expect(() => readPixels(decoded(image(1, 1, () => RED)))).toThrow("No 2D context")
  })
})

describe("pixelateImage", () => {
  it("is filter on the image's pixels", () => {
    const pixels = image(40, 40, (x) => (x < 20 ? RED : BLUE))

    const result = pixelateImage(decoded(pixels), { width: 4, height: 4, colors: 2 })

    expect(result).toEqual(filter(pixels, { width: 4, height: 4, colors: 2 }))
    expect(toPixels(result.pixels).map(([r, , b]) => (r > b ? "R" : "B"))).toEqual(Array.from({ length: 16 }, (_v, i) => (i % 4 < 2 ? "R" : "B")))
    expect(pixelateImage(decoded(pixels), { width: 4 }).pixels).toMatchObject({ width: 4, height: 4 })
  })

  it("rejects a colour count outside 1 to 256", () => {
    expect(() => pixelateImage(decoded(image(4, 4, () => RED)), { width: 2, height: 2, colors: 0 })).toThrow(RangeError)
  })
})

describe("drawPixels", () => {
  it("resizes the canvas and puts the pixels", () => {
    const puts: unknown[] = []
    const canvas = { width: 0, height: 0, getContext: () => ({ putImageData: (data: unknown, x: number, y: number) => puts.push([data, x, y]) }) }
    const pixels = image(2, 2, () => RED)

    drawPixels(canvas as unknown as HTMLCanvasElement, pixels)

    expect([canvas.width, canvas.height]).toEqual([2, 2])
    expect(puts).toHaveLength(1)
    expect((puts[0] as unknown[])[0]).toMatchObject({ width: 2, height: 2 })
  })

  it("fails clearly without a 2D context", () => {
    const canvas = { getContext: () => null }
    expect(() => drawPixels(canvas as unknown as HTMLCanvasElement, image(1, 1, () => RED))).toThrow("No 2D context")
  })
})
