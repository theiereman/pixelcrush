// Compiles src/ into dist/: JavaScript and type declarations. The sources
// import "./x" without an extension, which a bundler resolves but Node and a
// browser do not, so the extension is written in.
import { execFileSync } from "node:child_process"
import { readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const dist = join(root, "dist")

rmSync(dist, { recursive: true, force: true })
execFileSync(process.execPath, [join(root, "node_modules", "typescript", "bin", "tsc"), "-p", join(root, "tsconfig.build.json")], { cwd: root, stdio: "inherit" })

for (const name of readdirSync(dist)) {
  if (!/\.(js|d\.ts)$/.test(name)) continue
  const file = join(dist, name)
  const text = readFileSync(file, "utf8")
    .replace(/(from\s+["'])(\.\/[^"']+?)(?<!\.js)(["'])/g, (_, a, path, b) => `${a}${path}.js${b}`)
    .replace(/(import\(\s*["'])(\.\/[^"']+?)(?<!\.js)(["']\s*\))/g, (_, a, path, b) => `${a}${path}.js${b}`)
  writeFileSync(file, text)
}
console.log(`built into ${dist}`)
