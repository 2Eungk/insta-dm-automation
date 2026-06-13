import type { ResponsePayload } from "./http"

export type RequestHeaders = Readonly<Record<string, string | readonly string[] | undefined>>

export const LOCAL_SECURITY_HEADERS = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "x-frame-options": "DENY",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "cross-origin-resource-policy": "same-site",
  "x-robots-tag": "noindex, nofollow",
} as const

export const SECURITY_READINESS = {
  hostGuard: "loopback-only-hosts",
  cors: "loopback-or-null-origins-only",
  bodyLimitBytes: 262_144,
  jsonOnlyPost: true,
  rateLimit: "in-memory-local-window",
  cache: "no-store",
  tokenValuesReturned: false,
  liveMetaDefault: "disabled-unless-LOCAL_LIVE_META_ENABLED-true",
} as const

const ALLOWED_ORIGIN_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"])
const ALLOWED_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"])

export class ForbiddenHostError extends Error {
  constructor() {
    super("Local server rejected a non-loopback Host header.")
    this.name = "ForbiddenHostError"
  }
}

export class UnsupportedMediaTypeError extends Error {
  constructor() {
    super("POST requests must use application/json on this local server.")
    this.name = "UnsupportedMediaTypeError"
  }
}

export class RateLimitExceededError extends Error {
  constructor() {
    super("Too many local requests. Wait a moment before retrying.")
    this.name = "RateLimitExceededError"
  }
}

export function firstHeaderValue(headers: RequestHeaders | undefined, name: string): string | undefined {
  const value = headers?.[name] ?? headers?.[name.toLowerCase()]
  if (Array.isArray(value)) {
    return value[0]
  }
  return typeof value === "string" ? value : undefined
}

function headerHost(value: string | undefined): string | undefined {
  if (value === undefined || value.trim().length === 0) {
    return undefined
  }
  const withoutPort = value.trim().replace(/^([^:]+):\d+$/, "$1")
  return withoutPort.toLowerCase()
}

function originHost(origin: string | undefined): string | undefined {
  if (origin === undefined || origin === "null" || origin.trim().length === 0) {
    return undefined
  }

  try {
    return new URL(origin).hostname.toLowerCase()
  } catch {
    return undefined
  }
}

export function assertLoopbackHost(headers: RequestHeaders | undefined): void {
  const host = headerHost(firstHeaderValue(headers, "host"))
  if (host !== undefined && !ALLOWED_HOSTS.has(host)) {
    throw new ForbiddenHostError()
  }
}

export function assertJsonPost(headers: RequestHeaders | undefined): void {
  const contentType = firstHeaderValue(headers, "content-type")?.toLowerCase() ?? ""
  if (!contentType.includes("application/json")) {
    throw new UnsupportedMediaTypeError()
  }
}

export function corsAllowOrigin(origin: string | undefined): string {
  if (origin === undefined || origin === "null") {
    return "null"
  }
  const host = originHost(origin)
  return host !== undefined && ALLOWED_ORIGIN_HOSTS.has(host) ? origin : "null"
}

export function hardenResponseHeaders(payload: ResponsePayload, headers: RequestHeaders | undefined): ResponsePayload {
  const origin = firstHeaderValue(headers, "origin")
  const nextHeaders = {
    ...payload.headers,
    ...LOCAL_SECURITY_HEADERS,
    "cache-control": "no-store",
    "access-control-allow-origin": corsAllowOrigin(origin),
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    vary: "Origin",
  }

  return {
    ...payload,
    headers: nextHeaders,
  }
}

type RateBucket = {
  count: number
  resetAt: number
}

export function createLocalRateLimiter(options: { readonly limit: number; readonly windowMs: number }) {
  const buckets = new Map<string, RateBucket>()

  return {
    check(key: string, now = Date.now()): void {
      const current = buckets.get(key)
      if (current === undefined || current.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + options.windowMs })
        return
      }

      current.count += 1
      if (current.count > options.limit) {
        throw new RateLimitExceededError()
      }
    },
    reset(): void {
      buckets.clear()
    },
  }
}
