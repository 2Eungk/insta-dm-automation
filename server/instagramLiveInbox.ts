import { readMetaLiveInboxConfig } from "./config"
import { json } from "./http"
import {
  accountResult,
  classifyMetaError,
  commentsResult,
  conversationsResult,
  messagesResult,
  sanitizeMetaError,
  setupCapability,
  unavailableCapability,
} from "./instagramLiveInboxParsing"
import type { RuntimeEnv } from "./config"
import type { ResponsePayload } from "./http"
import type { CapabilityResult, CommentPreview, ConversationPreview, MessagePreview } from "./instagramLiveInboxParsing"

export type FetchLikeResponse = {
  readonly ok: boolean
  readonly status: number
  readonly json: () => Promise<unknown>
}

export type FetchLike = (url: URL, init: { readonly method: "GET"; readonly signal: AbortSignal }) => Promise<FetchLikeResponse>

export type LiveInboxDependencies = {
  readonly fetch: FetchLike
}

const REQUEST_TIMEOUT_MS = 10_000
const MAX_PREVIEW_ITEMS = 5

class LiveInboxRequestError extends Error {
  readonly name = "LiveInboxRequestError"

  constructor(readonly capability: string) {
    super(`Meta ${capability} request failed before a usable response was received.`)
  }
}

export function createDefaultLiveInboxFetch(): FetchLike {
  return async (url, init) => fetch(url, init)
}

function graphUrl(apiVersion: string, path: string, accessToken: string): URL {
  const url = new URL(`https://graph.instagram.com/${apiVersion}/${path}`)
  url.searchParams.set("access_token", accessToken)
  return url
}

async function requestCapability<T>(
  url: URL,
  capability: string,
  accessToken: string,
  dependencies: LiveInboxDependencies,
  parse: (payload: unknown) => CapabilityResult<T>,
): Promise<CapabilityResult<T>> {
  const controller = new AbortController()
  const timeout = setTimeout(() => {
    controller.abort()
  }, REQUEST_TIMEOUT_MS)

  try {
    const response = await dependencies.fetch(url, { method: "GET", signal: controller.signal })
    const payload = await response.json()
    if (!response.ok) {
      const metaError = sanitizeMetaError(payload, [accessToken])
      return {
        status: classifyMetaError(response.status, metaError),
        message: "Meta did not allow this read-only diagnostic request.",
        metaError,
      }
    }
    return parse(payload)
  } catch (error) {
    if (error instanceof Error) {
      return {
        status: "not-available",
        message: new LiveInboxRequestError(capability).message,
      }
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

function safetyPayload() {
  return {
    sendsMessages: false,
    createsSubscriptions: false,
    persistsWebhookPayloads: false,
    exposesTokens: false,
  } as const
}

function tokenPayload(status: "ok" | "setup-required", source: "long-lived" | "short-lived" | "missing", present: boolean) {
  return {
    status,
    source,
    preferredEnv: "META_LONG_LIVED_ACCESS_TOKEN",
    fallbackEnv: "META_ACCESS_TOKEN",
    present,
    valueExposed: false,
  } as const
}

function diagnosticsPayload(
  token: ReturnType<typeof tokenPayload>,
  account: CapabilityResult<{ readonly username: string } | readonly never[]>,
  conversations: CapabilityResult<readonly ConversationPreview[] | readonly never[]>,
  messages: CapabilityResult<readonly MessagePreview[] | readonly never[]>,
  comments: CapabilityResult<readonly CommentPreview[] | readonly never[]>,
) {
  return {
    ok: true,
    mode: "read-only-live-preview",
    safety: safetyPayload(),
    token,
    account,
    capabilities: { conversations, messages, comments },
    preview: {
      conversations: conversations.data ?? [],
      messages: messages.data ?? [],
      comments: comments.data ?? [],
    },
  } as const
}

async function readMessages(
  conversationId: string | undefined,
  apiVersion: string,
  accessToken: string,
  dependencies: LiveInboxDependencies,
): Promise<CapabilityResult<readonly MessagePreview[] | readonly never[]>> {
  if (conversationId === undefined) {
    return unavailableCapability("No conversation was available to preview messages without a user-selected conversation id.")
  }

  const messagesUrl = graphUrl(apiVersion, `${conversationId}/messages`, accessToken)
  messagesUrl.searchParams.set("fields", "id,created_time,from,to,message")
  messagesUrl.searchParams.set("limit", String(MAX_PREVIEW_ITEMS))
  return requestCapability(messagesUrl, "conversation messages", accessToken, dependencies, messagesResult)
}

export async function liveInboxDiagnostics(env: RuntimeEnv, dependencies: LiveInboxDependencies): Promise<ResponsePayload> {
  const config = readMetaLiveInboxConfig(env)
  if (config.accessToken === undefined) {
    const missingToken = setupCapability("Set META_LONG_LIVED_ACCESS_TOKEN locally, or META_ACCESS_TOKEN as a fallback, before checking live read-only capabilities.")
    return json(200, diagnosticsPayload(tokenPayload("setup-required", "missing", false), missingToken, missingToken, missingToken, missingToken))
  }

  const accountUrl = graphUrl(config.apiVersion, "me", config.accessToken)
  accountUrl.searchParams.set("fields", "user_id,username")
  const account = await requestCapability(accountUrl, "account identity", config.accessToken, dependencies, accountResult)

  if (config.igUserId === undefined) {
    const missingIgUserId = setupCapability("Set META_IG_USER_ID locally to check conversations, messages, and comment previews.")
    return json(200, diagnosticsPayload(tokenPayload("ok", config.tokenSource, true), account, missingIgUserId, missingIgUserId, missingIgUserId))
  }

  const conversationsUrl = graphUrl(config.apiVersion, `${config.igUserId}/conversations`, config.accessToken)
  conversationsUrl.searchParams.set("platform", "instagram")
  conversationsUrl.searchParams.set("fields", "id,updated_time")
  conversationsUrl.searchParams.set("limit", String(MAX_PREVIEW_ITEMS))
  const conversations = await requestCapability(conversationsUrl, "conversation list", config.accessToken, dependencies, conversationsResult)
  const messages = await readMessages(conversations.data?.[0]?.id, config.apiVersion, config.accessToken, dependencies)

  const commentsUrl = graphUrl(config.apiVersion, `${config.igUserId}/media`, config.accessToken)
  commentsUrl.searchParams.set("fields", "id,comments.limit(3){id,text,username,timestamp}")
  commentsUrl.searchParams.set("limit", "3")
  const comments = await requestCapability(commentsUrl, "media comments", config.accessToken, dependencies, commentsResult)

  return json(200, diagnosticsPayload(tokenPayload("ok", config.tokenSource, true), account, conversations, messages, comments))
}
