import { createAuditLog } from "./saasAudit"
import type { TokenEncryption } from "./saasCrypto"
import type {
  InstagramAccount,
  InstagramAccountId,
  OAuthTokenId,
  SaasSnapshot,
  SafeOAuthToken,
  TenantId,
  Workspace,
  WorkspaceId,
} from "./saasTypes"

export const DEMO_TENANT_ID: TenantId = { kind: "tenant-id", value: "tenant_local_demo_owner" }
export const DEMO_WORKSPACE_ID: WorkspaceId = { kind: "workspace-id", value: "workspace_local_demo" }
export const DEMO_ACCOUNT_ID: InstagramAccountId = { kind: "instagram-account-id", value: "ig_account_local_demo" }
const DEMO_TOKEN_ID: OAuthTokenId = { kind: "oauth-token-id", value: "oauth_token_local_demo" }
const DEMO_CREATED_AT = "2026-06-13T00:00:00.000Z"

export type DemoBootstrapResult = {
  readonly workspace: Workspace
  readonly account: InstagramAccount
  readonly token: SafeOAuthToken
  readonly privacyBoundary: readonly string[]
}

function safeToken(): SafeOAuthToken {
  return {
    id: DEMO_TOKEN_ID,
    accountId: DEMO_ACCOUNT_ID,
    workspaceId: DEMO_WORKSPACE_ID,
    provider: "meta",
    encryptedValue: "[encrypted]",
    scopes: ["instagram_business_basic", "instagram_business_manage_messages"],
    valueReturned: false,
    tokenValueReturned: false,
  }
}

export function createDemoBootstrapSnapshot(encryption: TokenEncryption): { readonly snapshot: SaasSnapshot; readonly result: DemoBootstrapResult } {
  const workspace: Workspace = {
    id: DEMO_WORKSPACE_ID,
    ownerId: DEMO_TENANT_ID,
    name: "Local Demo Workspace",
    plan: "local-dev",
  }
  const account: InstagramAccount = {
    id: DEMO_ACCOUNT_ID,
    workspaceId: DEMO_WORKSPACE_ID,
    igUserId: "17841400000000000",
    username: "local_demo_business",
    connectionStatus: "metadata-only",
  }
  const encrypted = encryption.encrypt("local-dev-placeholder-token")
  const token = {
    id: DEMO_TOKEN_ID,
    accountId: DEMO_ACCOUNT_ID,
    workspaceId: DEMO_WORKSPACE_ID,
    provider: "meta",
    encryptedValue: JSON.stringify(encrypted),
    scopes: ["instagram_business_basic", "instagram_business_manage_messages"],
    valueReturned: false,
  } as const
  const snapshot: SaasSnapshot = {
    users: [{ id: DEMO_TENANT_ID, email: "owner@example.local", role: "owner" }],
    workspaces: [workspace],
    instagramAccounts: [account],
    oauthTokens: [token],
    auditLogs: [
      createAuditLog({
        id: "audit_local_bootstrap",
        workspaceId: DEMO_WORKSPACE_ID,
        actorId: DEMO_TENANT_ID,
        action: "workspace.bootstrap_demo",
        metadata: { token: "local-dev-placeholder-token", raw_payload: "not stored", accountId: account.id.value },
        createdAt: DEMO_CREATED_AT,
      }),
    ],
    inboxItems: [],
    replyDrafts: [],
    approvalEvents: [],
    webhookEvents: [],
  }

  return {
    snapshot,
    result: {
      workspace,
      account,
      token: safeToken(),
      privacyBoundary: [
        "Token value is encrypted with DEV_ENCRYPTION_KEY only for local development.",
        "HTTP responses expose token metadata only, never token values.",
        "Raw Meta webhook payloads are not persisted by this scaffold.",
      ],
    },
  }
}
