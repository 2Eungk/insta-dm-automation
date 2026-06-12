import { z } from "zod"
import { normalizeMockMetaWebhookPayload } from "../src/domain/metaReadiness"
import { readOAuthConfig, readVerifyToken } from "./config"
import type { RuntimeEnv, SetupError } from "./config"

export type ResponsePayload = {
  readonly statusCode: number
  readonly headers?: Readonly<Record<string, string>>
  readonly body: string
}

export type RouteRequest = {
  readonly method: string
  readonly url: URL
  readonly body: unknown
}

const callbackQuerySchema = z.object({
  code: z.string().min(1).optional(),
  error: z.string().optional(),
  error_reason: z.string().optional(),
  error_description: z.string().optional(),
  state: z.string().optional(),
})

function json(statusCode: number, payload: unknown): ResponsePayload {
  return {
    statusCode,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    body: JSON.stringify(payload),
  }
}

function text(statusCode: number, body: string): ResponsePayload {
  return {
    statusCode,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    body,
  }
}

function statusForSetupError(error: SetupError): ResponsePayload {
  return json(503, error)
}

function buildAuthorizationUrl(config: Exclude<ReturnType<typeof readOAuthConfig>, SetupError>): string {
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
    step: "meta-connection-step-1",
    persistence: "disabled",
    outboundCalls: false,
  })
}

function startOAuth(env: RuntimeEnv): ResponsePayload {
  const config = readOAuthConfig(env)
  if ("error" in config) {
    return statusForSetupError(config)
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
    return statusForSetupError(verifyToken)
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
  const normalized = normalizeMockMetaWebhookPayload(request.body, "local-webhook-post")
  return json(200, {
    ok: true,
    mode: "dry-run",
    persistence: "disabled",
    outboundCalls: false,
    normalized,
  })
}

export function routeMetaRequest(request: RouteRequest, env: RuntimeEnv): ResponsePayload {
  const path = request.url.pathname

  if (request.method === "GET" && path === "/health") {
    return health()
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

  return json(404, {
    ok: false,
    error: "not-found",
    message: "Route is not available in the local Meta Step 1 backend.",
  })
}
