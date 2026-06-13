import { z } from "zod"
import { readMetaAccessTokenConfig } from "./config"
import type { RuntimeEnv, SetupError } from "./config"
import type { ResponsePayload } from "./routes"

export type FetchLikeResponse = {
  readonly ok: boolean
  readonly status: number
  readonly json: () => Promise<unknown>
}

export type FetchLike = (url: URL, init: { readonly method: "GET"; readonly signal: AbortSignal }) => Promise<FetchLikeResponse>

export type InstagramTokenStatusDependencies = {
  readonly fetch: FetchLike
}

const metaMeSchema = z
  .object({
    username: z.string().optional(),
    user_id: z.union([z.string(), z.number()]).optional(),
    id: z.union([z.string(), z.number()]).optional(),
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

class MetaGraphRequestError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "MetaGraphRequestError"
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

function sanitizeMessage(message: string | undefined, accessToken: string): string {
  const fallback = "Meta returned an error for the read-only token status request."
  if (message === undefined || message.trim().length === 0) {
    return fallback
  }
  return message.replaceAll(accessToken, "[redacted]")
}

function sanitizeErrorCode(code: string | number | undefined): string | number | "not-provided" {
  return code ?? "not-provided"
}

function metaErrorPayload(statusCode: number, payload: unknown, accessToken: string): ResponsePayload {
  const parsed = metaErrorSchema.safeParse(payload)
  if (parsed.success) {
    return json(statusCode, {
      ok: false,
      error: "meta-api-error",
      metaError: {
        code: sanitizeErrorCode(parsed.data.error.code),
        message: sanitizeMessage(parsed.data.error.message, accessToken),
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

function parseSuccessPayload(payload: unknown): ResponsePayload {
  const parsed = metaMeSchema.safeParse(payload)
  if (!parsed.success) {
    return json(502, {
      ok: false,
      error: "invalid-meta-response",
      message: "Meta returned a successful response that did not match the expected read-only /me shape.",
    })
  }

  return json(200, {
    ok: true,
    username: parsed.data.username ?? "not-provided",
    user_id_present: parsed.data.user_id !== undefined,
    id_present: parsed.data.id !== undefined,
  })
}

export function createDefaultInstagramFetch(): FetchLike {
  return async (url, init) => {
    const response = await fetch(url, init)
    return response
  }
}

export async function instagramMe(env: RuntimeEnv, dependencies: InstagramTokenStatusDependencies): Promise<ResponsePayload> {
  const config = readMetaAccessTokenConfig(env)
  if ("error" in config) {
    return setupRequired(config)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => {
    controller.abort()
  }, REQUEST_TIMEOUT_MS)

  try {
    const requestUrl = new URL(`https://graph.instagram.com/${config.apiVersion}/me`)
    requestUrl.searchParams.set("fields", "user_id,username")
    requestUrl.searchParams.set("access_token", config.accessToken)

    const response = await dependencies.fetch(requestUrl, { method: "GET", signal: controller.signal })
    const payload = await response.json()
    if (!response.ok) {
      return metaErrorPayload(response.status, payload, config.accessToken)
    }
    return parseSuccessPayload(payload)
  } catch (error) {
    if (error instanceof Error) {
      return json(502, {
        ok: false,
        error: "meta-request-failed",
        message: new MetaGraphRequestError("The read-only Meta request failed before a usable response was received.").message,
      })
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}
