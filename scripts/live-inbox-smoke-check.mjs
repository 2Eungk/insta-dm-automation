import assert from "node:assert/strict"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { build } from "esbuild"

async function loadRouteModule() {
  const tempDir = await mkdtemp(join(tmpdir(), "insta-dm-live-inbox-"))
  const outputFile = join(tempDir, "live-inbox-entry.mjs")
  await build({
    stdin: {
      contents: 'import { routeMetaRequest } from "./server/routes"; export { routeMetaRequest }',
      loader: "ts",
      resolveDir: process.cwd(),
      sourcefile: "live-inbox-entry.ts",
    },
    bundle: true,
    format: "esm",
    outfile: outputFile,
    platform: "node",
    target: "node22",
  })

  return { module: await import(pathToFileURL(outputFile).href), tempDir }
}

function request(module, env, dependencies) {
  return module.routeMetaRequest(
    { method: "GET", url: new URL("/instagram/live-inbox", "http://127.0.0.1:8787"), body: {} },
    env,
    dependencies,
  )
}

function jsonBody(response) {
  return JSON.parse(response.body)
}

async function verifyMissingEnv(module) {
  let fetchCalled = false
  const response = await request(module, {}, { liveInbox: { fetch: async () => { fetchCalled = true } } })
  const body = jsonBody(response)

  assert.equal(response.statusCode, 200)
  assert.equal(fetchCalled, false)
  assert.equal(body.token.status, "setup-required")
  assert.equal(body.token.present, false)
  assert.equal(body.token.valueExposed, false)
  assert.equal(body.capabilities.conversations.status, "setup-required")
  assert.equal(response.body.includes("access_token"), false)
}

async function verifySuccessAndTokenPreference(module) {
  const shortToken = "short-token-should-not-be-used"
  const longToken = "long-token-should-be-used"
  const customerText = "secret customer message body"
  const calledPaths = []

  const response = await request(
    module,
    {
      META_ACCESS_TOKEN: shortToken,
      META_LONG_LIVED_ACCESS_TOKEN: longToken,
      META_IG_USER_ID: "17841400000000000",
    },
    {
      liveInbox: {
        fetch: async (url) => {
          calledPaths.push(url.pathname)
          assert.equal(url.searchParams.get("access_token"), longToken)
          assert.notEqual(url.searchParams.get("access_token"), shortToken)

          if (url.pathname.endsWith("/me")) {
            assert.equal(url.searchParams.get("fields"), "user_id,username")
            return { ok: true, status: 200, json: async () => ({ username: "local_business" }) }
          }
          if (url.pathname.endsWith("/17841400000000000/conversations")) {
            assert.equal(url.searchParams.get("platform"), "instagram")
            assert.equal(url.searchParams.get("fields"), "id,updated_time")
            return { ok: true, status: 200, json: async () => ({ data: [{ id: "conv-1", updated_time: "2026-06-13T09:00:00+09:00" }] }) }
          }
          if (url.pathname.endsWith("/conv-1/messages")) {
            assert.equal(url.searchParams.get("fields"), "id,created_time,from,to,message")
            return {
              ok: true,
              status: 200,
              json: async () => ({
                data: [{ id: "message-1", created_time: "2026-06-13T09:01:00+09:00", from: { username: "buyer" }, message: customerText }],
              }),
            }
          }
          if (url.pathname.endsWith("/17841400000000000/media")) {
            assert.equal(url.searchParams.get("fields"), "id,comments.limit(3){id,text,username,timestamp}")
            return {
              ok: true,
              status: 200,
              json: async () => ({
                data: [{ id: "media-1", comments: { data: [{ id: "comment-1", text: customerText, username: "buyer", timestamp: "2026-06-13T09:02:00+09:00" }] } }],
              }),
            }
          }
          throw new Error(`unexpected URL ${url.toString()}`)
        },
      },
    },
  )
  const body = jsonBody(response)

  assert.equal(response.statusCode, 200)
  assert.deepEqual(calledPaths, [
    "/v23.0/me",
    "/v23.0/17841400000000000/conversations",
    "/v23.0/conv-1/messages",
    "/v23.0/17841400000000000/media",
  ])
  assert.equal(body.token.status, "ok")
  assert.equal(body.token.source, "long-lived")
  assert.equal(body.account.data.username, "local_business")
  assert.equal(body.capabilities.conversations.status, "ok")
  assert.equal(body.capabilities.messages.status, "ok")
  assert.equal(body.capabilities.comments.status, "ok")
  assert.equal(body.preview.conversations.length, 1)
  assert.equal(body.preview.messages[0].textPresent, true)
  assert.equal(body.preview.comments[0].textPresent, true)
  assert.equal(response.body.includes(longToken), false)
  assert.equal(response.body.includes(shortToken), false)
  assert.equal(response.body.includes(customerText), false)
}

async function verifyPermissionAndSanitization(module) {
  const token = "permission-token"
  const response = await request(
    module,
    { META_LONG_LIVED_ACCESS_TOKEN: token, META_IG_USER_ID: "17841400000000000" },
    {
      liveInbox: {
        fetch: async (url) => {
          if (url.pathname.endsWith("/me")) {
            return { ok: true, status: 200, json: async () => ({ username: "local_business" }) }
          }
          return {
            ok: false,
            status: 403,
            json: async () => ({ error: { code: 10, message: `Permission denied for ${token}`, fbtrace_id: "trace-should-not-leak" } }),
          }
        },
      },
    },
  )
  const body = jsonBody(response)

  assert.equal(response.statusCode, 200)
  assert.equal(body.capabilities.conversations.status, "permission-required")
  assert.equal(body.capabilities.conversations.metaError.message, "Permission denied for [redacted]")
  assert.equal(response.body.includes(token), false)
  assert.equal(response.body.includes("trace-should-not-leak"), false)
}

async function verifyInvalidTokenStatus(module) {
  const token = "invalid-token"
  const response = await request(
    module,
    { META_LONG_LIVED_ACCESS_TOKEN: token, META_IG_USER_ID: "17841400000000000" },
    {
      liveInbox: {
        fetch: async () => ({
          ok: false,
          status: 400,
          json: async () => ({ error: { code: 190, message: `Invalid OAuth access token ${token}` } }),
        }),
      },
    },
  )
  const body = jsonBody(response)

  assert.equal(response.statusCode, 200)
  assert.equal(body.account.status, "setup-required")
  assert.equal(body.account.metaError.message, "Invalid OAuth access token [redacted]")
  assert.equal(response.body.includes(token), false)
}

const { module, tempDir } = await loadRouteModule()
try {
  await verifyMissingEnv(module)
  await verifySuccessAndTokenPreference(module)
  await verifyPermissionAndSanitization(module)
  await verifyInvalidTokenStatus(module)
} finally {
  await rm(tempDir, { force: true, recursive: true })
}

console.log("live-inbox-smoke-check: read-only diagnostics passed")
