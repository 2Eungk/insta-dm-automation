import assert from "node:assert/strict"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { build } from "esbuild"
import { exchangeAndWriteLongLivedToken } from "./exchange-long-lived-token.mjs"

async function loadRouteModule() {
  const tempDir = await mkdtemp(join(tmpdir(), "insta-dm-long-lived-route-"))
  const outputFile = join(tempDir, "long-lived-route-entry.mjs")
  await build({
    stdin: {
      contents: 'import { routeMetaRequest } from "./server/routes"; export { routeMetaRequest }',
      loader: "ts",
      resolveDir: process.cwd(),
      sourcefile: "long-lived-route-entry.ts",
    },
    bundle: true,
    format: "esm",
    outfile: outputFile,
    platform: "node",
    target: "node22",
  })

  return { module: await import(pathToFileURL(outputFile).href), tempDir }
}

function request(module, path, env, dependencies) {
  return module.routeMetaRequest(
    { method: "POST", url: new URL(path, "http://127.0.0.1:8787"), body: {} },
    env,
    dependencies,
  )
}

async function verifyRoute() {
  const { module, tempDir } = await loadRouteModule()
  const accessToken = "local-short-token"
  const appSecret = "local-app-secret"
  const longToken = "local-long-token"

  try {
    const missingResponse = await request(module, "/auth/meta/exchange-long-lived", {}, {})
    const missing = JSON.parse(missingResponse.body)
    assert.equal(missingResponse.statusCode, 503)
    assert.deepEqual(missing.missing, ["LOCAL_LIVE_META_ENABLED=true"])

    let fetchCalled = false
    const dependencies = {
      longLivedTokenExchange: {
        fetch: async (url) => {
          fetchCalled = true
          assert.equal(url.href.startsWith("https://graph.instagram.com/access_token?"), true)
          assert.equal(url.searchParams.get("grant_type"), "ig_exchange_token")
          assert.equal(url.searchParams.get("access_token"), accessToken)
          assert.equal(url.searchParams.get("client_secret"), appSecret)
          return { ok: true, status: 200, json: async () => ({ access_token: longToken, expires_in: 5_184_000 }) }
        },
      },
    }

    const dryRun = JSON.parse((await request(module, "/auth/meta/exchange-long-lived?dry_run=true", { LOCAL_LIVE_META_ENABLED: "true", META_ACCESS_TOKEN: accessToken, META_APP_SECRET: appSecret }, dependencies)).body)
    assert.equal(dryRun.ok, true)
    assert.equal(dryRun.outboundCalls, false)
    assert.equal(fetchCalled, false)

    const tokenReturnResponse = await request(module, "/auth/meta/exchange-long-lived?return_token=true", { LOCAL_LIVE_META_ENABLED: "true", META_ACCESS_TOKEN: accessToken, META_APP_SECRET: appSecret }, dependencies)
    assert.equal(tokenReturnResponse.statusCode, 400)
    assert.equal(fetchCalled, false)

    const successResponse = await request(module, "/auth/meta/exchange-long-lived", { LOCAL_LIVE_META_ENABLED: "true", META_ACCESS_TOKEN: accessToken, META_APP_SECRET: appSecret }, dependencies)
    const success = JSON.parse(successResponse.body)
    assert.equal(fetchCalled, true)
    assert.equal(success.ok, true)
    assert.equal(success.tokenReceived, true)
    assert.equal(success.expiresInSeconds, 5_184_000)
    assert.equal(successResponse.body.includes(accessToken), false)
    assert.equal(successResponse.body.includes(appSecret), false)
    assert.equal(successResponse.body.includes(longToken), false)

    const errorResponse = await request(module, "/auth/meta/exchange-long-lived", { LOCAL_LIVE_META_ENABLED: "true", META_ACCESS_TOKEN: accessToken, META_APP_SECRET: appSecret }, {
      longLivedTokenExchange: {
        fetch: async () => ({
          ok: false,
          status: 400,
          json: async () => ({ error: { code: 190, message: `Bad ${accessToken} and ${appSecret}` } }),
        }),
      },
    })
    assert.equal(errorResponse.statusCode, 400)
    assert.equal(errorResponse.body.includes(accessToken), false)
    assert.equal(errorResponse.body.includes(appSecret), false)
    assert.equal(JSON.parse(errorResponse.body).metaError.message, "Bad [redacted] and [redacted]")
  } finally {
    await rm(tempDir, { force: true, recursive: true })
  }
}

async function verifyCli() {
  const tempDir = await mkdtemp(join(tmpdir(), "insta-dm-long-lived-cli-"))
  const envFile = join(tempDir, ".env")
  const accessToken = "cli-short-token"
  const appSecret = "cli-app-secret"
  const longToken = "cli-long-token"
  let output = ""

  try {
    await writeFile(envFile, `META_ACCESS_TOKEN=${accessToken}\nMETA_APP_SECRET=${appSecret}\n`, { mode: 0o600 })
    await exchangeAndWriteLongLivedToken({
      envFile,
      stdout: { write: (chunk) => { output += chunk } },
      fetchImpl: async (url) => {
        assert.equal(url.searchParams.get("access_token"), accessToken)
        assert.equal(url.searchParams.get("client_secret"), appSecret)
        return { ok: true, status: 200, json: async () => ({ access_token: longToken, expires_in: 5_184_000 }) }
      },
    })

    const updatedEnv = await readFile(envFile, "utf8")
    const backup = await readFile(resolve(tempDir, ".env.bak"), "utf8")
    assert.equal(updatedEnv.includes(`META_LONG_LIVED_ACCESS_TOKEN=${longToken}`), true)
    assert.equal(backup.includes(`META_ACCESS_TOKEN=${accessToken}`), true)
    assert.equal(output.includes(accessToken), false)
    assert.equal(output.includes(appSecret), false)
    assert.equal(output.includes(longToken), false)
  } finally {
    await rm(tempDir, { force: true, recursive: true })
  }
}

await verifyRoute()
await verifyCli()
console.log("long-lived-token-smoke-check: sanitized route and CLI exchange passed")
