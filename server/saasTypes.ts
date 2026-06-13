export type TenantId = {
  readonly kind: "tenant-id"
  readonly value: string
}

export type WorkspaceId = {
  readonly kind: "workspace-id"
  readonly value: string
}

export type InstagramAccountId = {
  readonly kind: "instagram-account-id"
  readonly value: string
}

export type OAuthTokenId = {
  readonly kind: "oauth-token-id"
  readonly value: string
}

export type TenantUser = {
  readonly id: TenantId
  readonly email: string
  readonly role: "owner" | "operator" | "viewer"
}

export type Workspace = {
  readonly id: WorkspaceId
  readonly ownerId: TenantId
  readonly name: string
  readonly plan: "local-dev" | "lean-paid" | "growth"
}

export type InstagramAccount = {
  readonly id: InstagramAccountId
  readonly workspaceId: WorkspaceId
  readonly igUserId: string
  readonly username: string
  readonly connectionStatus: "metadata-only" | "token-ready" | "needs-review"
}

export type StoredOAuthToken = {
  readonly id: OAuthTokenId
  readonly accountId: InstagramAccountId
  readonly workspaceId: WorkspaceId
  readonly provider: "meta"
  readonly encryptedValue: string
  readonly scopes: readonly string[]
  readonly valueReturned: false
}

export type AuditLog = {
  readonly id: string
  readonly workspaceId: WorkspaceId
  readonly actorId: TenantId
  readonly action: string
  readonly metadata: Readonly<Record<string, string | number | boolean>>
  readonly createdAt: string
}

export type InboxItem = {
  readonly id: string
  readonly workspaceId: WorkspaceId
  readonly accountId: InstagramAccountId
  readonly channel: "dm" | "comment"
  readonly senderRef: string
  readonly receivedAt: string
  readonly bodyMode: "mock-redacted" | "live-text-present"
  readonly bodyPreview: "[mock text redacted]" | "[live text not stored]"
  readonly textPresent: boolean
  readonly sourceWebhookEventId: string
}

export type ReplyDraft = {
  readonly id: string
  readonly workspaceId: WorkspaceId
  readonly inboxItemId: string
  readonly status: "drafted" | "approved" | "rejected"
  readonly bodyMode: "local-mock-only"
}

export type ApprovalEvent = {
  readonly id: string
  readonly workspaceId: WorkspaceId
  readonly replyDraftId: string
  readonly actorId: TenantId
  readonly decision: "approved" | "held" | "rejected"
  readonly createdAt: string
}

export type WebhookEvent = {
  readonly id: string
  readonly workspaceId: WorkspaceId
  readonly provider: "meta"
  readonly dedupeId: string
  readonly eventType: "dm" | "comment" | "echo" | "unsupported" | "error"
  readonly textPresent: boolean
  readonly payloadStored: false
  readonly createdAt: string
}

export type SaasSnapshot = {
  readonly users: readonly TenantUser[]
  readonly workspaces: readonly Workspace[]
  readonly instagramAccounts: readonly InstagramAccount[]
  readonly oauthTokens: readonly StoredOAuthToken[]
  readonly auditLogs: readonly AuditLog[]
  readonly inboxItems: readonly InboxItem[]
  readonly replyDrafts: readonly ReplyDraft[]
  readonly approvalEvents: readonly ApprovalEvent[]
  readonly webhookEvents: readonly WebhookEvent[]
}

export type SafeOAuthToken = Omit<StoredOAuthToken, "encryptedValue"> & {
  readonly encryptedValue: "[encrypted]"
  readonly tokenValueReturned: false
}
