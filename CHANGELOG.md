# Changelog

## 0.1.0

First release.

- `pixelate` and `cropRegion`: an RGBA image cropped to the target ratio, placed by an anchor on either axis, and averaged down to a grid, with binary alpha.
- `buildPalette`, `applyPalette` and `quantize`: a palette by median cut, and an image mapped to it.
- `filter`: `pixelate` then `quantize`.
- `pixelateImage`, `drawPixels` and `sourceSize`: the same from a browser image, bitmap or canvas, and back onto a canvas.
