import assert from "node:assert/strict"
import { once } from "node:events"
import { mkdtemp, rm } from "node:fs/promises"
import { request as httpRequest } from "node:http"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { build } from "esbuild"

async function listen(server) {
  server.listen(0, "127.0.0.1")
  await once(server, "listening")
  const address = server.address()
  assert.equal(typeof address, "object")
  assert.notEqual(address, null)
  return address.port
}

function rawHttpGet(port, path, headers) {
  return new Promise((resolve, reject) => {
    const req = httpRequest({ host: "127.0.0.1", port, path, method: "GET", headers }, (res) => {
      let body = ""
      res.setEncoding("utf8")
      res.on("data", (chunk) => {
        body += chunk
      })
      res.on("end", () => {
        resolve({ statusCode: res.statusCode, body })
      })
    })
    req.on("error", reject)
    req.end()
  })
}

async function main() {
  const tempDir = await mkdtemp(join(tmpdir(), "insta-dm-security-smoke-"))
  const outputFile = join(tempDir, "security-smoke-entry.mjs")
  let server

  try {
    await build({
      stdin: {
        contents: `
          import { createMetaServer } from "./server/app"
          export { createMetaServer }
        `,
        loader: "ts",
        resolveDir: process.cwd(),
        sourcefile: "security-smoke-entry.ts",
      },
      bundle: true,
      format: "esm",
      outfile: outputFile,
      platform: "node",
      target: "node22",
    })

    const module = await import(pathToFileURL(outputFile).href)
    server = module.createMetaServer({ env: { META_ACCESS_TOKEN: "local-secret-token" } })
    const port = await listen(server)
    const baseUrl = `http://127.0.0.1:${port}`

    const securityResponse = await fetch(`${baseUrl}/app/security`, {
      headers: { origin: "http://127.0.0.1:5173" },
    })
    assert.equal(securityResponse.status, 200)
    assert.equal(securityResponse.headers.get("x-content-type-options"), "nosniff")
    assert.equal(securityResponse.headers.get("x-frame-options"), "DENY")
    assert.equal(securityResponse.headers.get("referrer-policy"), "no-referrer")
    assert.equal(securityResponse.headers.get("access-control-allow-origin"), "http://127.0.0.1:5173")
    const security = await securityResponse.json()
    assert.equal(security.security.hostGuard, "loopback-only-hosts")
    assert.equal(security.security.tokenValuesReturned, false)
    assert.equal(JSON.stringify(security).includes("local-secret-token"), false)

    const hostileOriginResponse = await fetch(`${baseUrl}/app/security`, {
      headers: { origin: "https://evil.example" },
    })
    assert.equal(hostileOriginResponse.headers.get("access-control-allow-origin"), "null")

    const hostileHostResponse = await rawHttpGet(port, "/app/security", { host: "evil.example" })
    assert.equal(hostileHostResponse.statusCode, 403)
    assert.equal(JSON.parse(hostileHostResponse.body).error, "forbidden-host")

    const wrongContentTypeResponse = await fetch(`${baseUrl}/friends-beta/invite/validate`, {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "FRIENDS-BETA-LOCAL",
    })
    assert.equal(wrongContentTypeResponse.status, 415)
    assert.equal((await wrongContentTypeResponse.json()).error, "unsupported-media-type")

    const invalidInviteResponse = await fetch(`${baseUrl}/friends-beta/invite/validate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ inviteCode: "x".repeat(100) }),
    })
    assert.equal(invalidInviteResponse.status, 400)
    assert.equal(JSON.stringify(await invalidInviteResponse.json()).includes("x".repeat(100)), false)
  } finally {
    if (server !== undefined) {
      server.close()
      await once(server, "close")
    }
    await rm(tempDir, { force: true, recursive: true })
  }
}

await main()
console.log("security-smoke-check: host, cors, headers, JSON-only POST, and redaction passed")
