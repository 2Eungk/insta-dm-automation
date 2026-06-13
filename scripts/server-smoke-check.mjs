import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { build } from "esbuild"

function assert(condition, label) {
  if (!condition) {
    throw new Error(label)
  }
}

async function main() {
  const tempDir = await mkdtemp(join(tmpdir(), "insta-dm-server-smoke-"))
  const outputFile = join(tempDir, "server-smoke-entry.mjs")

  try {
    await build({
      stdin: {
        contents: `
          import { routeMetaRequest } from "./server/routes"
          import { MOCK_WEBHOOK_PAYLOADS } from "./src/data/mockWebhookPayloads"
          export { routeMetaRequest, MOCK_WEBHOOK_PAYLOADS }
        `,
        loader: "ts",
        resolveDir: process.cwd(),
        sourcefile: "server-smoke-entry.ts",
      },
      bundle: true,
      format: "esm",
      outfile: outputFile,
      platform: "node",
      target: "node22",
    })

    const module = await import(pathToFileURL(outputFile).href)
    const env = {
      META_APP_ID: "local-app-id",
      META_REDIRECT_URI: "http://127.0.0.1:8787/auth/meta/callback",
      META_OAUTH_STATE: "local-state",
      META_VERIFY_TOKEN: "local-verify-token",
    }
    const request = (method, path, body = {}) => module.routeMetaRequest({
      method,
      url: new URL(path, "http://127.0.0.1:8787"),
      body,
    }, env)

    const health = JSON.parse(request("GET", "/health").body)
    assert(health.ok === true, "health should return ok")
    assert(health.outboundCalls === false, "health should report no outbound calls")

    const missingStartResponse = module.routeMetaRequest({
      method: "GET",
      url: new URL("/auth/meta/start", "http://127.0.0.1:8787"),
      body: {},
    }, {})
    const missingStart = JSON.parse(missingStartResponse.body)
    assert(missingStartResponse.statusCode === 503, "missing OAuth env should be a setup error")
    assert(missingStart.error === "setup-required", "missing OAuth env should name setup-required")
    assert(missingStart.missing.includes("META_APP_ID"), "missing OAuth env should include META_APP_ID")

    const oauthStart = JSON.parse(request("GET", "/auth/meta/start").body)
    const instagramAuthorizationUrl = new URL(oauthStart.authorizationUrl)
    assert(oauthStart.ok === true, "OAuth start should build a URL when env is set")
    assert(instagramAuthorizationUrl.host === "www.instagram.com", "default OAuth URL should use Instagram host")
    assert(instagramAuthorizationUrl.pathname === "/oauth/authorize", "Instagram OAuth URL should use authorize path")
    assert(instagramAuthorizationUrl.searchParams.get("client_id") === "local-app-id", "OAuth URL should include app id")
    assert(instagramAuthorizationUrl.searchParams.get("redirect_uri") === env.META_REDIRECT_URI, "OAuth URL should include redirect URI")
    assert(instagramAuthorizationUrl.searchParams.get("response_type") === "code", "OAuth URL should request an auth code")
    assert(
      instagramAuthorizationUrl.searchParams.get("scope") === "instagram_business_basic,instagram_business_manage_messages,pages_show_list",
      "OAuth URL should include comma-joined Instagram Business scopes",
    )
    assert(instagramAuthorizationUrl.searchParams.get("state") === "local-state", "OAuth URL should include state")
    assert(oauthStart.tokenExchange === "not-implemented-in-step-1", "OAuth start should not exchange tokens")

    const embedOverrideStart = JSON.parse(module.routeMetaRequest({
      method: "GET",
      url: new URL("/auth/meta/start", "http://127.0.0.1:8787"),
      body: {},
    }, {
      ...env,
      META_INSTAGRAM_EMBED_URL: "https://www.instagram.com/oauth/authorize?client_id=dashboard-app-id&response_type=code&scope=instagram_business_basic",
    }).body)
    const embedOverrideUrl = new URL(embedOverrideStart.authorizationUrl)
    assert(embedOverrideUrl.host === "www.instagram.com", "Embed override should keep Instagram host")
    assert(embedOverrideUrl.pathname === "/oauth/authorize", "Embed override should keep Instagram authorize path")
    assert(embedOverrideUrl.searchParams.get("client_id") === "dashboard-app-id", "Embed override should use dashboard client id")
    assert(embedOverrideUrl.searchParams.get("redirect_uri") === env.META_REDIRECT_URI, "Embed override should fill missing redirect URI")
    assert(embedOverrideUrl.searchParams.get("state") === "local-state", "Embed override should fill missing state")

    const embedWithDashboardState = JSON.parse(module.routeMetaRequest({
      method: "GET",
      url: new URL("/auth/meta/start", "http://127.0.0.1:8787"),
      body: {},
    }, {
      ...env,
      META_INSTAGRAM_EMBED_URL:
        "https://www.instagram.com/oauth/authorize?client_id=dashboard-app-id&redirect_uri=https%3A%2F%2Fdashboard.example%2Fcallback&state=dashboard-state",
    }).body)
    const embedWithDashboardStateUrl = new URL(embedWithDashboardState.authorizationUrl)
    assert(
      embedWithDashboardStateUrl.searchParams.get("redirect_uri") === "https://dashboard.example/callback",
      "Embed override should preserve dashboard redirect URI when present",
    )
    assert(
      embedWithDashboardStateUrl.searchParams.get("state") === "dashboard-state",
      "Embed override should preserve dashboard state when present",
    )

    const embedWithoutAppId = JSON.parse(module.routeMetaRequest({
      method: "GET",
      url: new URL("/auth/meta/start", "http://127.0.0.1:8787"),
      body: {},
    }, {
      META_INSTAGRAM_EMBED_URL:
        "https://www.instagram.com/oauth/authorize?client_id=dashboard-app-id&redirect_uri=https%3A%2F%2Fdashboard.example%2Fcallback&state=dashboard-state",
      META_VERIFY_TOKEN: "local-verify-token",
    }).body)
    const embedWithoutAppIdUrl = new URL(embedWithoutAppId.authorizationUrl)
    assert(
      embedWithoutAppIdUrl.searchParams.get("client_id") === "dashboard-app-id",
      "Embed override should not require META_APP_ID when the dashboard URL is set",
    )

    const unsafeEmbedResponse = module.routeMetaRequest({
      method: "GET",
      url: new URL("/auth/meta/start", "http://127.0.0.1:8787"),
      body: {},
    }, {
      ...env,
      META_INSTAGRAM_EMBED_URL:
        "https://www.instagram.com/oauth/authorize?client_id=dashboard-app-id&code=oauth-code&access_token=token&client_secret=secret",
    })
    const unsafeEmbed = JSON.parse(unsafeEmbedResponse.body)
    assert(unsafeEmbedResponse.statusCode === 400, "unsafe Embed URL should be rejected")
    assert(unsafeEmbed.error === "invalid-instagram-embed-url", "unsafe Embed URL should report invalid embed URL")

    const facebookStart = JSON.parse(module.routeMetaRequest({
      method: "GET",
      url: new URL("/auth/meta/start", "http://127.0.0.1:8787"),
      body: {},
    }, { ...env, META_OAUTH_PROVIDER: "facebook" }).body)
    const facebookAuthorizationUrl = new URL(facebookStart.authorizationUrl)
    assert(facebookAuthorizationUrl.host === "www.facebook.com", "Facebook OAuth provider should use Facebook host")
    assert(facebookAuthorizationUrl.pathname === "/v23.0/dialog/oauth", "Facebook OAuth provider should keep Graph version path")

    const missingCodeResponse = request("GET", "/auth/meta/callback?state=local-state")
    const missingCode = JSON.parse(missingCodeResponse.body)
    assert(missingCodeResponse.statusCode === 400, "OAuth callback should reject missing code")
    assert(missingCode.error === "missing-code", "OAuth callback should name missing code")

    const callback = JSON.parse(request("GET", "/auth/meta/callback?code=local-code&state=local-state").body)
    assert(callback.ok === true, "OAuth callback should accept code presence")
    assert(callback.tokenExchange === "not-implemented-in-step-1", "OAuth callback should not exchange tokens")

    const challengeResponse = request("GET", "/webhook/meta?hub.mode=subscribe&hub.verify_token=local-verify-token&hub.challenge=challenge-123")
    assert(challengeResponse.statusCode === 200, "matching verify token should pass")
    assert(challengeResponse.body === "challenge-123", "verify route should echo challenge text")

    const mismatchResponse = request("GET", "/webhook/meta?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=challenge-123")
    const mismatch = JSON.parse(mismatchResponse.body)
    assert(mismatchResponse.statusCode === 403, "wrong verify token should be rejected")
    assert(mismatch.error === "verify-token-mismatch", "wrong verify token should report mismatch")

    const dmFixture = module.MOCK_WEBHOOK_PAYLOADS.find((fixture) => fixture.id === "dm-message")
    assert(dmFixture !== undefined, "dm fixture should exist")
    const dryRun = JSON.parse(request("POST", "/webhook/meta", dmFixture.payload).body)
    assert(dryRun.ok === true, "dry-run webhook should return ok")
    assert(dryRun.persistence === "disabled", "dry-run webhook should not persist")
    assert(dryRun.outboundCalls === false, "dry-run webhook should not call outbound APIs")
    assert(dryRun.normalized.events.length === 1, "dry-run webhook should normalize one event")
  } finally {
    await rm(tempDir, { force: true, recursive: true })
  }
}

await main()
console.log("server-smoke-check: local Meta Step 1 endpoints passed")
