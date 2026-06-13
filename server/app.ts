import { createServer } from "node:http"
import { routeMetaRequest } from "./routes"
import type { RuntimeEnv } from "./config"
import type { ResponsePayload } from "./http"

type RequestLike = {
  readonly method?: string
  readonly url?: string
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

function send(response: ResponseLike, payload: ResponsePayload): void {
  response.writeHead(payload.statusCode, payload.headers ?? { "cache-control": "no-store" })
  response.end(payload.body)
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

async function handleRequest(request: RequestLike, response: ResponseLike, env: RuntimeEnv): Promise<void> {
  const method = request.method ?? "GET"
  const url = new URL(request.url ?? "/", "http://127.0.0.1")

  try {
    const body = method === "POST" ? await readJsonBody(request) : {}
    send(response, await routeMetaRequest({ method, url, body }, env))
  } catch (error) {
    if (error instanceof Error) {
      send(response, errorPayload(error))
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
