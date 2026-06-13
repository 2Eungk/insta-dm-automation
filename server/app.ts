import { createServer } from "node:http"
import { routeMetaRequest } from "./routes"
import type { RuntimeEnv } from "./config"
import type { ResponsePayload } from "./http"
import {
  ForbiddenHostError,
  RateLimitExceededError,
  UnsupportedMediaTypeError,
  assertJsonPost,
  assertLoopbackHost,
  createLocalRateLimiter,
  hardenResponseHeaders,
  type RequestHeaders,
} from "./security"

type RequestLike = {
  readonly method?: string
  readonly url?: string
  readonly headers?: RequestHeaders
  readonly socket?: { readonly remoteAddress?: string }
  readonly [Symbol.asyncIterator]: () => AsyncIterableIterator<string | Uint8Array>
}

type ResponseLike = {
  readonly writeHead: (statusCode: number, headers: Readonly<Record<string, string>>) => void
  readonly end: (body?: string) => void
}

export type ServerOptions = {
  readonly env: RuntimeEnv
}

class InvalidJsonBodyError extends Error {
  constructor() {
    super("Request body must be valid JSON.")
    this.name = "InvalidJsonBodyError"
  }
}

class BodyTooLargeError extends Error {
  constructor() {
    super("Request body is larger than the local dry-run limit.")
    this.name = "BodyTooLargeError"
  }
}

const MAX_BODY_BYTES = 262_144
const generalRateLimiter = createLocalRateLimiter({ limit: 240, windowMs: 60_000 })
const sensitiveRateLimiter = createLocalRateLimiter({ limit: 30, windowMs: 60_000 })

function send(response: ResponseLike, payload: ResponsePayload, requestHeaders?: RequestHeaders): void {
  const hardened = hardenResponseHeaders(payload, requestHeaders)
  response.writeHead(hardened.statusCode, hardened.headers ?? { "cache-control": "no-store" })
  response.end(hardened.body)
}

async function readJsonBody(request: RequestLike): Promise<unknown> {
  let body = ""
  const decoder = new TextDecoder()

  for await (const chunk of request) {
    body += typeof chunk === "string" ? chunk : decoder.decode(chunk)
    if (body.length > MAX_BODY_BYTES) {
      throw new BodyTooLargeError()
    }
  }

  if (body.trim().length === 0) {
    return {}
  }

  try {
    const parsed: unknown = JSON.parse(body)
    return parsed
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new InvalidJsonBodyError()
    }
    throw error
  }
}

function errorPayload(error: Error): ResponsePayload {
  if (error instanceof ForbiddenHostError) {
    return {
      statusCode: 403,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
      body: JSON.stringify({ ok: false, error: "forbidden-host", message: error.message }),
    }
  }

  if (error instanceof UnsupportedMediaTypeError) {
    return {
      statusCode: 415,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
      body: JSON.stringify({ ok: false, error: "unsupported-media-type", message: error.message }),
    }
  }

  if (error instanceof RateLimitExceededError) {
    return {
      statusCode: 429,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "retry-after": "60" },
      body: JSON.stringify({ ok: false, error: "rate-limited", message: error.message }),
    }
  }

  if (error instanceof InvalidJsonBodyError) {
    return {
      statusCode: 400,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
      body: JSON.stringify({ ok: false, error: "invalid-json", message: error.message }),
    }
  }

  if (error instanceof BodyTooLargeError) {
    return {
      statusCode: 413,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
      body: JSON.stringify({ ok: false, error: "body-too-large", message: error.message }),
    }
  }

  return {
    statusCode: 500,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    body: JSON.stringify({ ok: false, error: "internal-server-error", message: "Unhandled local server error." }),
  }
}

function rateLimitKey(request: RequestLike, method: string, path: string): string {
  const remoteAddress = request.socket?.remoteAddress ?? "local"
  return `${remoteAddress}:${method}:${path}`
}

function isSensitivePath(path: string): boolean {
  return path.startsWith("/auth/meta") || path.startsWith("/instagram") || path.startsWith("/friends-beta") || path.startsWith("/saas")
}

function enforceLocalSecurity(request: RequestLike, method: string, url: URL): void {
  assertLoopbackHost(request.headers)
  generalRateLimiter.check(rateLimitKey(request, method, "*"))
  if (isSensitivePath(url.pathname)) {
    sensitiveRateLimiter.check(rateLimitKey(request, method, url.pathname))
  }
  if (method === "POST") {
    assertJsonPost(request.headers)
  }
}

async function handleRequest(request: RequestLike, response: ResponseLike, env: RuntimeEnv): Promise<void> {
  const method = request.method ?? "GET"
  const url = new URL(request.url ?? "/", "http://127.0.0.1")

  try {
    enforceLocalSecurity(request, method, url)
    const body = method === "POST" ? await readJsonBody(request) : {}
    send(response, await routeMetaRequest({ method, url, body }, env), request.headers)
  } catch (error) {
    if (error instanceof Error) {
      send(response, errorPayload(error), request.headers)
      return
    }
    throw error
  }
}

export function createMetaServer(options: ServerOptions) {
  return createServer((request: RequestLike, response: ResponseLike) => {
    void handleRequest(request, response, options.env)
  })
}

