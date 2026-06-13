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

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "access-control-allow-origin": "*",
} as const

const TEXT_HEADERS = {
  "content-type": "text/plain; charset=utf-8",
  "cache-control": "no-store",
  "access-control-allow-origin": "*",
} as const

export const CORS_PREFLIGHT_HEADERS = {
  "cache-control": "no-store",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type",
} as const

export function json(statusCode: number, payload: unknown): ResponsePayload {
  return {
    statusCode,
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  }
}

export function text(statusCode: number, body: string): ResponsePayload {
  return {
    statusCode,
    headers: TEXT_HEADERS,
    body,
  }
}
