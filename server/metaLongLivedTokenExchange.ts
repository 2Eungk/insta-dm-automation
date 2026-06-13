import { z } from "zod"
import { readMetaLongLivedTokenExchangeConfig } from "./config"
import type { RuntimeEnv, SetupError } from "./config"
import type { ResponsePayload } from "./routes"

export type FetchLikeResponse = {
  readonly ok: boolean
  readonly status: number
  readonly json: () => Promise<unknown>
}

export type FetchLike = (url: URL, init: { readonly method: "GET"; readonly signal: AbortSignal }) => Promise<FetchLikeResponse>

export type LongLivedTokenExchangeDependencies = {
  readonly fetch: FetchLike
}

const exchangeSuccessSchema = z
  .object({
    access_token: z.string().min(1),
    expires_in: z.number().int().positive().optional(),
  })
  .passthrough()

const metaErrorSchema = z
  .object({
    error: z
      .object({
        code: z.union([z.string(), z.number()]).optional(),
        message: z.string().optional(),
      })
      .passthrough(),
  })
  .passthrough()

const REQUEST_TIMEOUT_MS = 10_000
const SAVE_INSTRUCTIONS = "The token is intentionally omitted from this HTTP response. Run npm run meta:exchange-long-lived locally to save it into .env."

class MetaLongLivedExchangeRequestError extends Error {
  constructor() {
    super("The Meta long-lived token exchange failed before a usable response was received.")
    this.name = "MetaLongLivedExchangeRequestError"
  }
}

function json(statusCode: number, payload: unknown): ResponsePayload {
  return {
    statusCode,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    body: JSON.stringify(payload),
  }
}

function setupRequired(error: SetupError): ResponsePayload {
  return json(503, error)
}

function sanitizeMessage(message: string | undefined, secrets: readonly string[]): string {
  const fallback = "Meta returned an error for the long-lived token exchange request."
  if (message === undefined || message.trim().length === 0) {
    return fallback
  }
  return secrets.reduce((sanitized, secret) => sanitized.replaceAll(secret, "[redacted]"), message)
}

function sanitizeErrorCode(code: string | number | undefined): string | number | "not-provided" {
  return code ?? "not-provided"
}

function metaErrorPayload(statusCode: number, payload: unknown, secrets: readonly string[]): ResponsePayload {
  const parsed = metaErrorSchema.safeParse(payload)
  if (parsed.success) {
    return json(statusCode, {
      ok: false,
      error: "meta-api-error",
      metaError: {
        code: sanitizeErrorCode(parsed.data.error.code),
        message: sanitizeMessage(parsed.data.error.message, secrets),
      },
    })
  }

  return json(statusCode, {
    ok: false,
    error: "meta-api-error",
    metaError: {
      code: "not-provided",
      message: "Meta returned an error response that did not match the expected shape.",
    },
  })
}

function successPayload(payload: unknown): ResponsePayload {
  const parsed = exchangeSuccessSchema.safeParse(payload)
  if (!parsed.success) {
    return json(502, {
      ok: false,
      error: "invalid-meta-response",
      message: "Meta returned a successful response that did not include a long-lived access token.",
    })
  }

  return json(200, {
    ok: true,
    tokenReceived: true,
    ...(parsed.data.expires_in === undefined ? {} : { expiresInSeconds: parsed.data.expires_in }),
    instructions: SAVE_INSTRUCTIONS,
  })
}

export function createDefaultLongLivedTokenExchangeFetch(): FetchLike {
  return async (url, init) => fetch(url, init)
}

export function longLivedTokenExchangeDryRun(env: RuntimeEnv): ResponsePayload {
  const config = readMetaLongLivedTokenExchangeConfig(env)
  if ("error" in config) {
    return setupRequired(config)
  }

  return json(200, {
    ok: true,
    mode: "dry-run",
    tokenReceived: false,
    outboundCalls: false,
    returnToken: false,
    instructions: "Environment is ready. Re-run this POST without dry_run=true to request a long-lived token from Meta.",
  })
}

export async function exchangeLongLivedToken(
  env: RuntimeEnv,
  dependencies: LongLivedTokenExchangeDependencies,
): Promise<ResponsePayload> {
  const config = readMetaLongLivedTokenExchangeConfig(env)
  if ("error" in config) {
    return setupRequired(config)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => {
    controller.abort()
  }, REQUEST_TIMEOUT_MS)

  try {
    const requestUrl = new URL("https://graph.instagram.com/access_token")
    requestUrl.searchParams.set("grant_type", "ig_exchange_token")
    requestUrl.searchParams.set("client_secret", config.appSecret)
    requestUrl.searchParams.set("access_token", config.accessToken)

    const response = await dependencies.fetch(requestUrl, { method: "GET", signal: controller.signal })
    const payload = await response.json()
    if (!response.ok) {
      return metaErrorPayload(response.status, payload, [config.accessToken, config.appSecret])
    }
    return successPayload(payload)
  } catch (error) {
    if (error instanceof Error) {
      return json(502, {
        ok: false,
        error: "meta-request-failed",
        message: new MetaLongLivedExchangeRequestError().message,
      })
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}
