# Changelog

## 0.2.0

- `pixelate` and `cropRegion` take an options object, like `filter`: `pixelate(pixels, { width, height, crop, anchor })`.
- One side of the target size is enough: the other follows the source's ratio, and nothing is cropped.
- `alpha: "keep"` keeps partial transparency instead of making it binary.
- `pixelateImage` reads the image once, at its size, then runs `filter`: its result no longer depends on the browser's resampling, nor on whether the source is an `<img>` or an `ImageBitmap`. `readPixels` does that reading on its own, a `<video>` is accepted, and an image not decoded yet is refused with a clear message. The `createSurface` option and the scratch-canvas types are gone.
- `applyPalette` takes the empty palette that `buildPalette` gives for a fully transparent image.
- A numeric `anchor`, an unknown `crop` and an unknown `alpha` throw a `RangeError`.
- `Pixels.data` is a plain `Uint8ClampedArray`: the types no longer need TypeScript 5.7.

## 0.1.0

First release.

- `pixelate` and `cropRegion`: an RGBA image cropped to the target ratio, placed by an anchor on either axis, and averaged down to a grid, with binary alpha.
- `buildPalette`, `applyPalette` and `quantize`: a palette by median cut, and an image mapped to it.
- `filter`: `pixelate` then `quantize`.
- `pixelateImage`, `drawPixels` and `sourceSize`: the same from a browser image, bitmap or canvas, and back onto a canvas.
