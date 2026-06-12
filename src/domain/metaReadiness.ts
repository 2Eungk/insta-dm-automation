import { z } from "zod"
import type { InstagramEvent } from "./types"

export type ContractItem = {
  readonly name: string
  readonly detail: string
}

export type MockConnectionAdapterContract = {
  readonly adapterName: string
  readonly boundary: string
  readonly requiredEnvironmentVariables: readonly ContractItem[]
  readonly permissions: readonly ContractItem[]
  readonly webhookEventShapes: readonly ContractItem[]
  readonly tokenLifecycle: readonly ContractItem[]
}

export type NormalizationIssue = {
  readonly severity: "error" | "warning"
  readonly code: string
  readonly message: string
}

export type WebhookNormalizationResult = {
  readonly events: readonly InstagramEvent[]
  readonly issues: readonly NormalizationIssue[]
}

export const MOCK_META_CONNECTION_CONTRACT: MockConnectionAdapterContract = {
  adapterName: "MockMetaConnectionAdapter",
  boundary: "Static local contract only. It stores no secrets, opens no OAuth flow, and performs no network calls.",
  requiredEnvironmentVariables: [
    { name: "META_APP_ID", detail: "Required later to identify the Meta app during OAuth and app review." },
    { name: "META_APP_SECRET", detail: "Required later only in encrypted backend secret storage, never in this browser app." },
    { name: "META_VERIFY_TOKEN", detail: "Required later for webhook verification between Meta and a backend endpoint." },
    { name: "META_REDIRECT_URI", detail: "Required later for OAuth callback handling on an approved backend route." },
    { name: "META_PAGE_ID", detail: "Required later to bind the Instagram business account to the correct Page asset." },
  ],
  permissions: [
    { name: "instagram_manage_messages", detail: "Needed later to receive and reply to Instagram messages after app review." },
    { name: "instagram_basic", detail: "Needed later to identify the connected Instagram professional account." },
    { name: "pages_manage_metadata", detail: "Needed later to subscribe a Page to webhook events." },
    { name: "pages_show_list", detail: "Needed later to let an approved user choose the correct Page asset." },
  ],
  webhookEventShapes: [
    { name: "DM message", detail: "entry[].messaging[].message.text becomes a local inbox DM preview." },
    { name: "Comment", detail: "entry[].changes[] with comments/comment field becomes a local comment preview." },
    { name: "Message echo", detail: "is_echo messages are treated as already-sent echoes and are not imported." },
    { name: "OAuth/permission error", detail: "Error payloads stay in validation output and never create inbox events." },
  ],
  tokenLifecycle: [
    { name: "Short-lived user token", detail: "Collected later through OAuth after approval, then exchanged server-side." },
    { name: "Long-lived token", detail: "Stored later only in encrypted backend storage with owner and scope metadata." },
    { name: "Rotation", detail: "Refresh and revoke paths must be designed before any production connection." },
    { name: "Revocation", detail: "Permission removal must stop imports, clear subscriptions, and preserve audit evidence." },
  ],
}

const userSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  username: z.string().optional(),
})

const messageSchema = z.object({
  is_echo: z.boolean().optional(),
  mid: z.string().optional(),
  text: z.string().optional(),
})

const messagingSchema = z.object({
  message: messageSchema.optional(),
  sender: userSchema.optional(),
  timestamp: z.number().optional(),
})

const commentValueSchema = z.object({
  comment_id: z.string().optional(),
  from: userSchema.optional(),
  text: z.string().optional(),
})

const changeSchema = z.object({
  field: z.string(),
  value: commentValueSchema.optional(),
})

const payloadSchema = z.object({
  entry: z.array(z.object({
    changes: z.array(changeSchema).optional(),
    id: z.string().optional(),
    messaging: z.array(messagingSchema).optional(),
    time: z.number().optional(),
  })).optional(),
  error: z.object({
    code: z.number().optional(),
    message: z.string(),
    type: z.string().optional(),
  }).optional(),
  object: z.string().optional(),
})

function timestampToIso(timestamp: number | undefined): string {
  if (timestamp === undefined) {
    return "2026-06-12T00:00:00.000Z"
  }
  const milliseconds = timestamp > 1_000_000_000_000 ? timestamp : timestamp * 1_000
  return new Date(milliseconds).toISOString()
}

function senderName(sender: z.infer<typeof userSchema> | undefined): string {
  return sender?.name ?? sender?.username ?? sender?.id ?? "Unknown Instagram user"
}

function senderHandle(sender: z.infer<typeof userSchema> | undefined): string {
  const visibleName = sender?.username ?? sender?.id ?? "unknown"
  return visibleName.startsWith("@") ? visibleName : `@${visibleName}`
}

function issue(severity: NormalizationIssue["severity"], code: string, message: string): NormalizationIssue {
  return { severity, code, message }
}

export function normalizeMockMetaWebhookPayload(payload: unknown, fixtureId: string): WebhookNormalizationResult {
  const parsed = payloadSchema.safeParse(payload)
  if (!parsed.success) {
    return {
      events: [],
      issues: [issue("error", "invalid-payload", "Webhook payload does not match the supported mock envelope.")],
    }
  }

  const issues: NormalizationIssue[] = []
  const events: InstagramEvent[] = []

  if (parsed.data.error !== undefined) {
    const code = parsed.data.error.code === undefined ? "unknown" : String(parsed.data.error.code)
    return {
      events,
      issues: [issue("error", "meta-permission-denied", `${parsed.data.error.type ?? "MetaError"} ${code}: ${parsed.data.error.message}`)],
    }
  }

  if (parsed.data.object !== "instagram") {
    issues.push(issue("warning", "unexpected-object", "Payload object is not instagram; dry run continues for fixture review."))
  }

  const entries = parsed.data.entry ?? []
  if (entries.length === 0) {
    issues.push(issue("error", "missing-entry", "Webhook payload has no entry array to normalize."))
  }

  entries.forEach((entry, entryIndex) => {
    entry.messaging?.forEach((messaging, messageIndex) => {
      if (messaging.message?.is_echo === true) {
        issues.push(issue("warning", "message-echo", "Message echo detected; it represents an outgoing reply and is not imported."))
        return
      }
      if (messaging.message?.text === undefined) {
        issues.push(issue("error", "missing-message-text", "DM payload is missing message.text, so no inbox event was created."))
        return
      }
      events.push({
        channel: "dm",
        id: messaging.message.mid ?? `${fixtureId}-dm-${entryIndex}-${messageIndex}`,
        message: messaging.message.text,
        receivedAt: timestampToIso(messaging.timestamp ?? entry.time),
        senderHandle: senderHandle(messaging.sender),
        senderName: senderName(messaging.sender),
      })
    })

    entry.changes?.forEach((change, changeIndex) => {
      if (change.field !== "comments" && change.field !== "comment") {
        issues.push(issue("warning", "unsupported-change", `Unsupported webhook change field: ${change.field}`))
        return
      }
      if (change.value?.text === undefined) {
        issues.push(issue("error", "missing-comment-text", "Comment payload is missing value.text, so no inbox event was created."))
        return
      }
      events.push({
        channel: "comment",
        id: change.value.comment_id ?? `${fixtureId}-comment-${entryIndex}-${changeIndex}`,
        message: change.value.text,
        receivedAt: timestampToIso(entry.time),
        senderHandle: senderHandle(change.value.from),
        senderName: senderName(change.value.from),
      })
    })
  })

  return { events, issues }
}
