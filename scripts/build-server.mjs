import { mkdir, rm } from "node:fs/promises"
import { join } from "node:path"
import { build } from "esbuild"

const outdir = join(process.cwd(), ".server")

await rm(outdir, { force: true, recursive: true })
await mkdir(outdir, { recursive: true })

await build({
  entryPoints: ["server/dev.ts"],
  bundle: true,
  format: "esm",
  outfile: join(outdir, "dev.js"),
  platform: "node",
  target: "node22",
})

console.log("server build: .server/dev.js")
