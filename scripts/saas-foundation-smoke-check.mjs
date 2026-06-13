import assert from "node:assert/strict"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { build } from "esbuild"

async function loadRouteModule() {
  const tempDir = await mkdtemp(join(tmpdir(), "insta-dm-saas-foundation-"))
  const outputFile = join(tempDir, "saas-foundation-entry.mjs")
  await build({
    stdin: {
      contents: `
        import { routeMetaRequest } from "./server/routes"
        import { createInMemorySaasStore } from "./server/saasPersistence"
        export { routeMetaRequest, createInMemorySaasStore }
      `,
      loader: "ts",
      resolveDir: process.cwd(),
      sourcefile: "saas-foundation-entry.ts",
    },
    bundle: true,
    format: "esm",
    outfile: outputFile,
    platform: "node",
    target: "node22",
  })

  return { module: await import(pathToFileURL(outputFile).href), tempDir }
}

function route(module, method, path, body, env, dependencies) {
  return module.routeMetaRequest(
    { method, url: new URL(path, "http://127.0.0.1:8787"), body },
    env,
    dependencies,
  )
}

function parse(response) {
  return JSON.parse(response.body)
}

async function verifyReadiness(module) {
  const response = await route(module, "GET", "/app/readiness", {}, {}, {})
  const body = parse(response)

  assert.equal(response.statusCode, 200)
  assert.equal(body.ok, true)
  assert.equal(body.productionReady, false)
  assert.equal(body.safety.sendsMessages, false)
  assert.equal(body.safety.createsWebhookSubscriptions, false)
  assert.equal(body.safety.persistsRawMetaPayloads, false)
  assert.equal(body.safety.exposesTokenValues, false)
}

async function verifyBootstrapAndAccountMetadata(module, store) {
  const env = { DEV_ENCRYPTION_KEY: "local-development-placeholder-key" }
  const response = await route(module, "POST", "/saas/bootstrap-demo", {}, env, { saas: { store } })
  const body = parse(response)
  const snapshot = await store.read()

  assert.equal(response.statusCode, 200)
  assert.equal(body.ok, true)
  assert.equal(body.token.encryptedValue, "[encrypted]")
  assert.equal(body.token.tokenValueReturned, false)
  assert.equal(response.body.includes("local-dev-placeholder-token"), false)
  assert.equal(snapshot.oauthTokens.length, 1)
  assert.notEqual(snapshot.oauthTokens[0].encryptedValue, "local-dev-placeholder-token")
  assert.equal(snapshot.oauthTokens[0].valueReturned, false)
  assert.equal(snapshot.auditLogs[0].metadata.token, "[redacted]")
  assert.equal(snapshot.auditLogs[0].metadata.raw_payload, "[redacted]")

  const accounts = parse(await route(module, "GET", "/saas/accounts", {}, {}, { saas: { store } }))
  assert.equal(accounts.accounts[0].username, "local_demo_business")
  assert.equal(accounts.accounts[0].tokenValueReturned, false)
}

async function verifyMockImportPreview(module, store) {
  const response = await route(
    module,
    "POST",
    "/saas/inbox/import-preview",
    { source: "mock-fixture", fixtureId: "dm-message" },
    {},
    { saas: { store } },
  )
  const body = parse(response)

  assert.equal(response.statusCode, 200)
  assert.equal(body.ok, true)
  assert.equal(body.persistence, "preview-only")
  assert.equal(body.inboxItems.length, 1)
  assert.equal(body.inboxItems[0].bodyPreview, "[mock text redacted]")
  assert.equal(body.webhookEvents[0].dedupeId.startsWith("meta:workspace_local_demo:"), true)
  assert.equal(body.webhookEvents[0].payloadStored, false)
  assert.equal(response.body.includes("린넨 셔츠"), false)
}

async function verifyLiveImportPreview(module, store) {
  const response = await route(
    module,
    "POST",
    "/saas/inbox/import-preview",
    {
      source: "live-diagnostics",
      preview: {
        messages: [{ id: "message-1", from: "buyer", textPresent: false }],
        comments: [{ mediaId: "media-1", commentId: "comment-1", username: "buyer", textPresent: true }],
      },
    },
    {},
    { saas: { store } },
  )
  const body = parse(response)

  assert.equal(response.statusCode, 200)
  assert.equal(body.inboxItems.length, 2)
  assert.equal(body.inboxItems[0].bodyPreview, "[live text not stored]")
  assert.equal(body.inboxItems[0].textPresent, false)
  assert.equal(response.body.includes("customer message"), false)
}

const { module, tempDir } = await loadRouteModule()
const store = module.createInMemorySaasStore()
try {
  await verifyReadiness(module)
  await verifyBootstrapAndAccountMetadata(module, store)
  await verifyMockImportPreview(module, store)
  await verifyLiveImportPreview(module, store)
} finally {
  await rm(tempDir, { force: true, recursive: true })
}

console.log("saas-foundation-smoke-check: local SaaS foundation passed")
