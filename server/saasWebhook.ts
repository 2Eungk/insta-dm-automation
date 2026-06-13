import { normalizeMockMetaWebhookPayload } from "../src/domain/metaReadiness"
import type { CommentPreview, MessagePreview } from "./instagramLiveInboxParsing"
import type { InstagramAccount, InboxItem, WebhookEvent, WorkspaceId } from "./saasTypes"

export type ImportPreviewSource =
  | { readonly kind: "mock-fixture"; readonly fixtureId: string; readonly payload: unknown }
  | {
      readonly kind: "live-diagnostics"
      readonly messages: readonly MessagePreview[]
      readonly comments: readonly CommentPreview[]
    }

export type InboxImportPreview = {
  readonly inboxItems: readonly InboxItem[]
  readonly webhookEvents: readonly WebhookEvent[]
  readonly persistence: "preview-only"
  readonly textStorage: "mock-redacted-or-live-presence-only"
}

function eventId(prefix: string, id: string): string {
  return `${prefix}:${id.replaceAll(":", "_")}`
}

function dedupeId(workspaceId: WorkspaceId, providerEventId: string): string {
  return `meta:${workspaceId.value}:${providerEventId}`
}

function webhookEvent(
  workspaceId: WorkspaceId,
  providerEventId: string,
  eventType: WebhookEvent["eventType"],
  textPresent: boolean,
): WebhookEvent {
  return {
    id: eventId("webhook", providerEventId),
    workspaceId,
    provider: "meta",
    dedupeId: dedupeId(workspaceId, providerEventId),
    eventType,
    textPresent,
    payloadStored: false,
    createdAt: "2026-06-13T00:00:00.000Z",
  }
}

function inboxItem(
  account: InstagramAccount,
  providerEventId: string,
  channel: InboxItem["channel"],
  senderRef: string,
  receivedAt: string,
  bodyMode: InboxItem["bodyMode"],
  bodyPreview: InboxItem["bodyPreview"],
  textPresent: boolean,
): InboxItem {
  return {
    id: eventId("inbox", providerEventId),
    workspaceId: account.workspaceId,
    accountId: account.id,
    channel,
    senderRef,
    receivedAt,
    bodyMode,
    bodyPreview,
    textPresent,
    sourceWebhookEventId: eventId("webhook", providerEventId),
  }
}

export function previewInboxImport(account: InstagramAccount, source: ImportPreviewSource): InboxImportPreview {
  if (source.kind === "mock-fixture") {
    const normalized = normalizeMockMetaWebhookPayload(source.payload, source.fixtureId)
    const webhookEvents = normalized.events.map((event) =>
      webhookEvent(account.workspaceId, `${source.fixtureId}:${event.id}`, event.channel, event.message.length > 0),
    )
    const inboxItems = normalized.events.map((event) =>
      inboxItem(
        account,
        `${source.fixtureId}:${event.id}`,
        event.channel,
        event.senderHandle,
        event.receivedAt,
        "mock-redacted",
        "[mock text redacted]",
        event.message.length > 0,
      ),
    )
    return { inboxItems, webhookEvents, persistence: "preview-only", textStorage: "mock-redacted-or-live-presence-only" }
  }

  const messageItems = source.messages.map((message) =>
    inboxItem(
      account,
      `live-message:${message.id}`,
      "dm",
      message.from ?? "sender-not-returned",
      message.createdTime ?? "not-returned",
      "live-text-present",
      "[live text not stored]",
      message.textPresent,
    ),
  )
  const commentItems = source.comments.map((comment) =>
    inboxItem(
      account,
      `live-comment:${comment.commentId}`,
      "comment",
      comment.username ?? "sender-not-returned",
      comment.timestamp ?? "not-returned",
      "live-text-present",
      "[live text not stored]",
      comment.textPresent,
    ),
  )
  const webhookEvents = [
    ...source.messages.map((message) => webhookEvent(account.workspaceId, `live-message:${message.id}`, "dm", message.textPresent)),
    ...source.comments.map((comment) => webhookEvent(account.workspaceId, `live-comment:${comment.commentId}`, "comment", comment.textPresent)),
  ]
  return { inboxItems: [...messageItems, ...commentItems], webhookEvents, persistence: "preview-only", textStorage: "mock-redacted-or-live-presence-only" }
}
