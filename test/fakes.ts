import type { Pixels } from "../src/index"

/** Something a fake context can draw from: it holds its pixels. */
export type Drawable = { pixels: Pixels }

export class FakeImageData {
  constructor(readonly data: Uint8ClampedArray, readonly width: number, readonly height: number) {}
}

/** A scratch canvas, standing in for `OffscreenCanvas`, whose `drawImage` copies the source's pixels. */
export class FakeCanvas {
  static made: FakeCanvas[] = []
  readonly context = new FakeContext(this)
  options: unknown
  pixels: Pixels = { width: 0, height: 0, data: new Uint8ClampedArray(0) }

  constructor(public width: number, public height: number) {
    FakeCanvas.made.push(this)
  }

  getContext(type: string, options?: unknown): FakeContext | null {
    this.options = options
    return type === "2d" ? this.context : null
  }
}

export class FakeContext {
  readonly draws: { source: unknown; args: number[] }[] = []

  constructor(readonly canvas: FakeCanvas) {}

  drawImage(source: Drawable, dx: number, dy: number): void {
    this.draws.push({ source, args: [dx, dy] })
    this.canvas.pixels = { width: this.canvas.width, height: this.canvas.height, data: new Uint8ClampedArray(source.pixels.data) }
  }

  getImageData(x: number, y: number, width: number, height: number): FakeImageData {
    if (x !== 0 || y !== 0 || width !== this.canvas.width || height !== this.canvas.height) throw new Error("partial read")
    return new FakeImageData(new Uint8ClampedArray(this.canvas.pixels.data), width, height)
  }
}
