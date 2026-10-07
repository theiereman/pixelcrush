# pixelcrush

Turns an image into pixel art: a small grid of pixels in a few colours.

![A portrait before, and after pixelation to 64 × 80 pixels in 16 colours](https://raw.githubusercontent.com/theiereman/pixelcrush/main/docs/before-after.png)

*Mona Lisa (public domain, via Wikimedia Commons), and `filter(source, { width: 64, height: 80, colors: 16 })` scaled up without smoothing.*

## How it works

The image is cropped to the target ratio, averaged down to `width × height` pixels, then reduced to a palette of at most `colors` colours computed from the image itself (median cut, no dithering). Alpha becomes binary: opaque or transparent. The same input always gives the same output. It is written in TypeScript, depends on nothing, and runs in a browser, in a Web Worker or on Node.

## Install

```sh
npm install pixelcrush
```

ES modules only. The types need TypeScript 5.7 or later, with the `DOM` or `WebWorker` lib (or `skipLibCheck`).

## Usage

From RGBA pixels, anywhere:

```ts
import { filter } from "pixelcrush"

const source = { width, height, data } // data: Uint8ClampedArray of width × height × 4 bytes
const { pixels, palette } = filter(source, { width: 64, height: 80, colors: 16 })
// pixels: { width: 64, height: 80, data }, palette: [[r, g, b], ...]
```

From an image in the browser:

```ts
import { drawPixels, pixelateImage } from "pixelcrush"

const { pixels } = pixelateImage(image, { width: 64, height: 80, colors: 16 })
drawPixels(canvas, pixels) // scale the canvas up with CSS: image-rendering: pixelated
```

`pixelateImage` takes a decoded `<img>`, an `ImageBitmap` or a canvas, and works in a Web Worker too; `sourceSize` gives such a source's size, and the `createSurface` option makes the scratch canvases yourself. An image from another origin must be loaded with `crossOrigin = "anonymous"` from a server that allows it, or its pixels cannot be read. It downscales with the browser's own resampling, so its result can differ slightly from one browser to another; `filter` on pixels you read yourself depends on nothing else.

Options, for both: `colors` (1 to 256, 32 by default), `crop` (`"cover"`, the default, keeps the largest region of the target ratio; `"none"` stretches the whole image) and `anchor` (`{ x, y }` from 0 to 1, where a cover crop sits; the middle by default). An option out of range throws a `RangeError`.

The steps are exported on their own too: `pixelate`, `cropRegion`, `buildPalette`, `applyPalette` and `quantize`, to reuse a palette across sizes or to pixelate without reducing colours.

## Contributing

Contributions are welcome: open an issue or a pull request. Before sending one:

```sh
npm install
npm test
npm run typecheck
npm run build
```

CI runs these and a smoke test of the build on every pull request. Releases are described in [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
