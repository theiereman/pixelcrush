// Imports the built package the way a consumer does, through its own name and
// `exports`, and runs it once. Catches an import Node cannot resolve (a
// relative import in dist/ without its extension), an entry point `exports`
// leaves out, and a result that is not what the README promises.
import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const dist = join(dirname(fileURLToPath(import.meta.url)), "..", "dist")

for (const name of readdirSync(dist).filter((file) => /\.(js|d\.ts)$/.test(file))) {
  for (const [, specifier] of readFileSync(join(dist, name), "utf8").matchAll(/from\s+["'](\.[^"']+)["']/g)) {
    assert.ok(specifier.endsWith(".js"), `${name} imports ${specifier} without an extension`)
  }
}

const api = await import("pixelcrush")
for (const name of ["applyPalette", "buildPalette", "cropRegion", "drawPixels", "filter", "pixelate", "pixelateImage", "quantize", "sourceSize"]) {
  assert.equal(typeof api[name], "function", `${name} is not exported`)
}

// A 4 × 4 gradient to a 2 × 2 grid in 2 colours, twice: the same result both times.
const data = new Uint8ClampedArray(4 * 4 * 4)
for (let index = 0; index < 16; index++) data.set([index * 16, 255 - index * 16, 128, 255], index * 4)
const source = { width: 4, height: 4, data }
const first = api.filter(source, { width: 2, height: 2, colors: 2 })
const second = api.filter(source, { width: 2, height: 2, colors: 2 })
assert.deepEqual([first.pixels.width, first.pixels.height, first.pixels.data.length], [2, 2, 16])
assert.equal(first.palette.length, 2)
assert.deepEqual(first, second)
assert.deepEqual(api.cropRegion(300, 600, 2, 3, { anchor: { y: 1 } }), { x: 0, y: 150, width: 300, height: 450 })

console.log("smoke test passed: the built package imports and runs")
