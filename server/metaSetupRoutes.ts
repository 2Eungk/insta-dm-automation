import { z } from "zod"
import { normalizeMockMetaWebhookPayload } from "../src/domain/metaReadiness"
import { exchangeLongLivedToken, longLivedTokenExchangeDryRun } from "./metaLongLivedTokenExchange"
import { json, text } from "./http"
import { readOAuthConfig, readVerifyToken } from "./config"
import { DEMO_ACCOUNT_ID } from "./saasBootstrap"
import { previewInboxImport } from "./saasWebhook"
import type { ConfigError, MetaOAuthConfig, RuntimeEnv } from "./config"
import type { RouteRequest, ResponsePayload } from "./http"
import type { LongLivedTokenExchangeDependencies } from "./metaLongLivedTokenExchange"
import type { InstagramAccount } from "./saasTypes"

const callbackQuerySchema = z.object({
  code: z.string().min(1).optional(),
  error: z.string().optional(),
  error_reason: z.string().optional(),
  error_description: z.string().optional(),
  state: z.string().optional(),
})

function statusForConfigError(error: ConfigError): ResponsePayload {
  return json(error.error === "setup-required" ? 503 : 400, error)
}

function buildInstagramEmbedAuthorizationUrl(config: Extract<MetaOAuthConfig, { readonly mode: "instagram-embed" }>): string {
  const authorizationUrl = new URL(config.instagramEmbedUrl)
  if (!authorizationUrl.searchParams.has("redirect_uri") && config.redirectUri !== undefined) {
    authorizationUrl.searchParams.set("redirect_uri", config.redirectUri)
  }
  if (!authorizationUrl.searchParams.has("state") && config.state !== undefined) {
    authorizationUrl.searchParams.set("state", config.state)
  }
  return authorizationUrl.toString()
}

function buildAuthorizationUrl(config: MetaOAuthConfig): string {
  if (config.mode === "instagram-embed") {
    return buildInstagramEmbedAuthorizationUrl(config)
  }

  const authorizationUrl =
    config.oauthProvider === "instagram"
      ? new URL("https://www.instagram.com/oauth/authorize")
      : new URL(`https://www.facebook.com/${config.apiVersion}/dialog/oauth`)
  authorizationUrl.searchParams.set("client_id", config.appId)
  authorizationUrl.searchParams.set("redirect_uri", config.redirectUri)
  authorizationUrl.searchParams.set("response_type", "code")
  authorizationUrl.searchParams.set("scope", config.scopes.join(","))
  authorizationUrl.searchParams.set("state", config.state)
  return authorizationUrl.toString()
}

function health(): ResponsePayload {
  return json(200, {
    ok: true,
    service: "insta-dm-automation-meta-local",
    step: "meta-connection-step-4",
    persistence: "disabled",
    outboundCalls: "token-status-long-lived-exchange-and-read-only-live-diagnostics-only",
  })
}

function startOAuth(env: RuntimeEnv): ResponsePayload {
  const config = readOAuthConfig(env)
  if ("error" in config) {
    return statusForConfigError(config)
  }

  return json(200, {
    ok: true,
    action: "copy-authorization-url",
    authorizationUrl: buildAuthorizationUrl(config),
    tokenExchange: "not-implemented-in-step-1",
    outboundCalls: false,
  })
}

function callback(request: RouteRequest): ResponsePayload {
  const parsed = callbackQuerySchema.safeParse(Object.fromEntries(request.url.searchParams))
  if (!parsed.success) {
    return json(400, {
      ok: false,
      error: "invalid-callback-query",
      message: "Meta callback query parameters were not in the expected shape.",
    })
  }

  if (parsed.data.error !== undefined) {
    return json(400, {
      ok: false,
      error: "meta-oauth-error",
      metaError: parsed.data.error,
      reason: parsed.data.error_reason ?? "not-provided",
      description: parsed.data.error_description ?? "not-provided",
      tokenExchange: "skipped",
    })
  }

  if (parsed.data.code === undefined) {
    return json(400, {
      ok: false,
      error: "missing-code",
      message: "Callback received no OAuth code. Step 1 validates presence only and never exchanges tokens.",
      tokenExchange: "skipped",
    })
  }

  return json(200, {
    ok: true,
    result: "oauth-code-received",
    codeReceived: true,
    stateReceived: parsed.data.state !== undefined,
    tokenExchange: "not-implemented-in-step-1",
    nextStep: "Implement server-side code exchange only after secrets are stored locally or in approved backend secret storage.",
  })
}

function verifyWebhook(request: RouteRequest, env: RuntimeEnv): ResponsePayload {
  const verifyToken = readVerifyToken(env)
  if (typeof verifyToken !== "string") {
    return statusForConfigError(verifyToken)
  }

  const mode = request.url.searchParams.get("hub.mode")
  const token = request.url.searchParams.get("hub.verify_token")
  const challenge = request.url.searchParams.get("hub.challenge")

  if (mode !== "subscribe" || challenge === null) {
    return json(400, {
      ok: false,
      error: "invalid-webhook-challenge",
      message: "Expected hub.mode=subscribe and hub.challenge query parameters.",
    })
  }

  if (token !== verifyToken) {
    return json(403, {
      ok: false,
      error: "verify-token-mismatch",
      message: "Webhook verify token did not match the local META_VERIFY_TOKEN value.",
    })
  }

  return text(200, challenge)
}

function dryRunWebhook(request: RouteRequest): ResponsePayload {
  const account: InstagramAccount = {
    id: DEMO_ACCOUNT_ID,
    workspaceId: { kind: "workspace-id", value: "workspace_local_demo" },
    igUserId: "17841400000000000",
    username: "local_demo_business",
    connectionStatus: "metadata-only",
  }
  const normalized = normalizeMockMetaWebhookPayload(request.body, "local-webhook-post")
  const importPreview = previewInboxImport(account, { kind: "mock-fixture", fixtureId: "local-webhook-post", payload: request.body })
  return json(200, {
    ok: true,
    mode: "dry-run",
    persistence: "disabled",
    outboundCalls: false,
    normalized: {
      events: normalized.events.map((event) => ({
        id: event.id,
        channel: event.channel,
        senderHandle: event.senderHandle,
        receivedAt: event.receivedAt,
        textPresent: event.message.length > 0,
        bodyPreview: "[mock text redacted]",
      })),
      issues: normalized.issues,
    },
    dedupe: importPreview.webhookEvents.map((event) => ({
      eventId: event.id,
      dedupeId: event.dedupeId,
      payloadStored: event.payloadStored,
    })),
  })
}

function shouldDryRun(request: RouteRequest): boolean {
  return request.url.searchParams.get("dry_run") === "true"
}

function rejectsTokenReturn(request: RouteRequest): ResponsePayload | undefined {
  const returnToken = request.url.searchParams.get("return_token") ?? "false"
  if (returnToken === "false") {
    return undefined
  }

  return json(400, {
    ok: false,
    error: "token-return-disabled",
    message: "HTTP responses never include access tokens. Use the local CLI if you need to write the token into .env.",
  })
}

export function routeMetaSetupRequest(
  request: RouteRequest,
  env: RuntimeEnv,
  longLivedTokenExchange: LongLivedTokenExchangeDependencies,
): ResponsePayload | Promise<ResponsePayload> | undefined {
  const path = request.url.pathname

  if (request.method === "GET" && path === "/health") {
    return health()
  }
  if (request.method === "POST" && path === "/auth/meta/exchange-long-lived") {
    const tokenReturnError = rejectsTokenReturn(request)
    if (tokenReturnError !== undefined) {
      return tokenReturnError
    }
    return shouldDryRun(request) ? longLivedTokenExchangeDryRun(env) : exchangeLongLivedToken(env, longLivedTokenExchange)
  }
  if (request.method === "GET" && path === "/auth/meta/start") {
    return startOAuth(env)
  }
  if (request.method === "GET" && path === "/auth/meta/callback") {
    return callback(request)
  }
  if (request.method === "GET" && path === "/webhook/meta") {
    return verifyWebhook(request, env)
  }
  if (request.method === "POST" && path === "/webhook/meta") {
    return dryRunWebhook(request)
  }

  return undefined
}
