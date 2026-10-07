import { afterEach, describe, expect, it, vi } from "vitest"
import { drawPixels, pixelateImage, sourceSize, type ReadContext } from "../src/image"
import type { Surface } from "../src/downscale"
import { FakeImageData, FakeSurface } from "./fakes"
import { image, toPixels } from "./helpers"

const RED: [number, number, number, number] = [200, 0, 0, 255]
const BLUE: [number, number, number, number] = [0, 0, 200, 255]

function surfaces() {
  const made: FakeSurface[] = []
  const createSurface = (width: number, height: number) => {
    const surface = new FakeSurface(width, height)
    made.push(surface)
    return surface as unknown as Surface<ReadContext>
  }
  return { made, createSurface }
}

describe("sourceSize", () => {
  it("reads the natural size of an image element and the size of a canvas or bitmap", () => {
    expect(sourceSize({ naturalWidth: 300, naturalHeight: 450, width: 1, height: 1 } as unknown as HTMLImageElement)).toEqual({ width: 300, height: 450 })
    expect(sourceSize({ width: 8, height: 6 } as unknown as ImageBitmap)).toEqual({ width: 8, height: 6 })
  })
})

describe("pixelateImage", () => {
  it("crops, halves, reads back and reduces to the asked colours", () => {
    const source = new FakeSurface(40, 40)
    source.pixels = image(40, 40, (x) => (x < 20 ? RED : BLUE))
    const { made, createSurface } = surfaces()

    const result = pixelateImage(source as unknown as HTMLCanvasElement, { width: 4, height: 4, colors: 2, createSurface })

    expect(made.length).toBeGreaterThan(0)
    expect(result.pixels).toMatchObject({ width: 4, height: 4 })
    expect(result.palette).toHaveLength(2)
    expect(toPixels(result.pixels).map(([r, , b]) => (r > b ? "R" : "B"))).toEqual(Array.from({ length: 16 }, (_v, i) => (i % 4 < 2 ? "R" : "B")))
  })

  it("keeps the whole image, stretched, with crop none", () => {
    const source = new FakeSurface(8, 2)
    source.pixels = image(8, 2, (x) => (x < 4 ? RED : BLUE))
    const { createSurface } = surfaces()

    const result = pixelateImage(source as unknown as HTMLCanvasElement, { width: 2, height: 1, colors: 2, crop: "none", createSurface })

    expect(toPixels(result.pixels).map(([r]) => (r > 100 ? "R" : "B"))).toEqual(["R", "B"])
  })

  it("rejects a colour count outside 1 to 256", () => {
    const source = new FakeSurface(4, 4)
    const { createSurface } = surfaces()
    expect(() => pixelateImage(source as unknown as HTMLCanvasElement, { width: 2, height: 2, colors: 0, createSurface })).toThrow(RangeError)
  })

  it("fails clearly when a scratch canvas has no 2D context", () => {
    const source = new FakeSurface(4, 4)
    expect(() => pixelateImage(source as unknown as HTMLCanvasElement, { width: 2, height: 2, createSurface: () => null })).toThrow("No 2D context")
  })
})

describe("drawPixels", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("resizes the canvas and puts the pixels", () => {
    vi.stubGlobal("ImageData", FakeImageData)
    const puts: unknown[] = []
    const canvas = { width: 0, height: 0, getContext: () => ({ putImageData: (data: unknown, x: number, y: number) => puts.push([data, x, y]) }) }
    const pixels = image(2, 2, () => RED)

    drawPixels(canvas as unknown as HTMLCanvasElement, pixels)

    expect([canvas.width, canvas.height]).toEqual([2, 2])
    expect(puts).toHaveLength(1)
    expect((puts[0] as unknown[])[1]).toBe(0)
  })

  it("fails clearly without a 2D context", () => {
    const canvas = { getContext: () => null }
    expect(() => drawPixels(canvas as unknown as HTMLCanvasElement, image(1, 1, () => RED))).toThrow("No 2D context")
  })
})
