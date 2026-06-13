import { z } from "zod"
import { MOCK_WEBHOOK_PAYLOADS } from "../src/data/mockWebhookPayloads"
import { DEFAULT_COMMENT_CAMPAIGN_CONFIG, assessCommentCampaignSafety } from "../src/domain/commentCampaign"
import { readMetaLiveInboxConfig } from "./config"
import { createLocalInviteCodeGate } from "./friendsBetaInviteGate"
import { evaluateFriendsBetaReadiness } from "./friendsBetaReadiness"
import { json } from "./http"
import { FRIENDS_BETA_OUTBOUND_LIMIT_POLICY } from "./outboundAutomationLimits"
import { SECURITY_READINESS } from "./security"
import { DEMO_ACCOUNT_ID, createDemoBootstrapSnapshot } from "./saasBootstrap"
import { createLocalDevTokenEncryption } from "./saasCrypto"
import { createInMemorySaasStore } from "./saasPersistence"
import { previewInboxImport } from "./saasWebhook"
import type { RuntimeEnv } from "./config"
import type { InviteCodeGate } from "./friendsBetaInviteGate"
import type { RouteRequest, ResponsePayload } from "./http"
import type { LiveInboxDependencies } from "./instagramLiveInbox"
import type { CommentPreview, MessagePreview } from "./instagramLiveInboxParsing"
import type { SaasStore } from "./saasPersistence"
import type { InstagramAccount } from "./saasTypes"

export type SaasRouteDependencies = {
  readonly store?: SaasStore
  readonly liveInbox?: LiveInboxDependencies
  readonly inviteCodeGate?: InviteCodeGate
}

const defaultStore = createInMemorySaasStore()
const defaultInviteCodeGate = createLocalInviteCodeGate()

const livePreviewSchema = z.object({
  messages: z.array(
    z.object({
      id: z.string(),
      createdTime: z.string().optional(),
      from: z.string().optional(),
      textPresent: z.boolean(),
    }),
  ),
  comments: z.array(
    z.object({
      mediaId: z.string(),
      commentId: z.string(),
      username: z.string().optional(),
      textPresent: z.boolean(),
      timestamp: z.string().optional(),
    }),
  ),
})

const importPreviewSchema = z.discriminatedUnion("source", [
  z.object({ source: z.literal("mock-fixture"), fixtureId: z.string() }),
  z.object({ source: z.literal("live-diagnostics"), preview: livePreviewSchema }),
])

const inviteValidationSchema = z.object({
  inviteCode: z.string().min(6).max(64).regex(/^[A-Za-z0-9_-]+$/),
  friendLabel: z.string().min(1).max(80).optional(),
})

function readiness(env: RuntimeEnv): ResponsePayload {
  const liveConfig = readMetaLiveInboxConfig(env)
  const safety = {
    sendsMessages: false,
    createsWebhookSubscriptions: false,
    acceptsPayments: false,
    persistsRawMetaPayloads: false,
    exposesTokenValues: false,
  } as const
  const friendsBeta = evaluateFriendsBetaReadiness(safety)
  const commentCampaignSafety = assessCommentCampaignSafety(DEFAULT_COMMENT_CAMPAIGN_CONFIG)

  return json(200, {
    ok: true,
    service: "insta-dm-automation-saas-local",
    persistence: "in-memory-or-local-json-behind-interface",
    productionReady: false,
    friendsBetaCandidate: friendsBeta.candidate,
    friendsBeta,
    safety,
    outboundAutomationLimits: FRIENDS_BETA_OUTBOUND_LIMIT_POLICY,
    commentCampaign: {
      enabled: true,
      config: DEFAULT_COMMENT_CAMPAIGN_CONFIG,
      safety: commentCampaignSafety,
    },
    gates: ["Choose managed Postgres/Supabase", "Install production key management", "Complete Meta app review", "Add billing and tenant limits"],
    localEnv: {
      devEncryptionKeyPresent: env["DEV_ENCRYPTION_KEY"] !== undefined,
      metaTokenPresent: liveConfig.accessToken !== undefined,
      tokenSource: liveConfig.tokenSource,
    },
    security: SECURITY_READINESS,
  })
}

function securityReadiness(): ResponsePayload {
  return json(200, {
    ok: true,
    service: "insta-dm-automation-saas-local",
    productionReady: false,
    friendsBetaSecurityCandidate: true,
    security: SECURITY_READINESS,
    outboundAutomationLimits: FRIENDS_BETA_OUTBOUND_LIMIT_POLICY,
    boundary: "Local hardening only. Keep Cloud Run/IAM/Secret Manager rules separate before any real deployment.",
  })
}

function hasDevEncryptionKey(env: RuntimeEnv): boolean {
  return (env["DEV_ENCRYPTION_KEY"]?.trim().length ?? 0) >= 16
}

async function bootstrapDemo(env: RuntimeEnv, store: SaasStore): Promise<ResponsePayload> {
  if (!hasDevEncryptionKey(env)) {
    return json(503, {
      ok: false,
      error: "setup-required",
      message: "Set DEV_ENCRYPTION_KEY locally before bootstrapping the demo SaaS workspace. Do not use this local placeholder strategy in production.",
      missing: ["DEV_ENCRYPTION_KEY"],
    })
  }

  const encryption = createLocalDevTokenEncryption(env)
  const bootstrap = createDemoBootstrapSnapshot(encryption)
  await store.write(bootstrap.snapshot)
  return json(200, { ok: true, ...bootstrap.result })
}

async function accountMetadata(store: SaasStore): Promise<ResponsePayload> {
  const snapshot = await store.read()
  return json(200, {
    ok: true,
    accounts: snapshot.instagramAccounts.map((account) => ({
      id: account.id.value,
      workspaceId: account.workspaceId.value,
      igUserId: account.igUserId,
      username: account.username,
      connectionStatus: account.connectionStatus,
      tokenValueReturned: false,
    })),
  })
}

function firstAccountOrDemo(snapshotAccount: InstagramAccount | undefined): InstagramAccount {
  return (
    snapshotAccount ?? {
      id: DEMO_ACCOUNT_ID,
      workspaceId: { kind: "workspace-id", value: "workspace_local_demo" },
      igUserId: "17841400000000000",
      username: "local_demo_business",
      connectionStatus: "metadata-only",
    }
  )
}

async function importPreview(request: RouteRequest, store: SaasStore): Promise<ResponsePayload> {
  const parsed = importPreviewSchema.safeParse(request.body)
  if (!parsed.success) {
    return json(400, {
      ok: false,
      error: "invalid-import-preview",
      message: "Expected source=mock-fixture with fixtureId, or source=live-diagnostics with preview messages/comments.",
    })
  }

  const snapshot = await store.read()
  const account = firstAccountOrDemo(snapshot.instagramAccounts.find((candidate) => candidate.id.value === DEMO_ACCOUNT_ID.value))
  if (parsed.data.source === "mock-fixture") {
    const fixture = MOCK_WEBHOOK_PAYLOADS.find((candidate) => candidate.id === parsed.data.fixtureId)
    if (fixture === undefined) {
      return json(404, { ok: false, error: "fixture-not-found", message: "No bundled webhook fixture matched fixtureId." })
    }
    return json(200, { ok: true, ...previewInboxImport(account, { kind: "mock-fixture", fixtureId: fixture.id, payload: fixture.payload }) })
  }

  const messages: readonly MessagePreview[] = parsed.data.preview.messages
  const comments: readonly CommentPreview[] = parsed.data.preview.comments
  return json(200, { ok: true, ...previewInboxImport(account, { kind: "live-diagnostics", messages, comments }) })
}

async function validateFriendsBetaInvite(request: RouteRequest, inviteCodeGate: InviteCodeGate): Promise<ResponsePayload> {
  const parsed = inviteValidationSchema.safeParse(request.body)
  if (!parsed.success) {
    return json(400, {
      ok: false,
      error: "invalid-invite-validation",
      message: "Expected a local inviteCode string. This stub does not create auth, users, or secrets.",
      invite: {
        accepted: false,
        mode: "friends-beta",
        authCreated: false,
        codePreview: "[redacted]",
        reason: "invalid-invite-code",
      },
    })
  }

  const invite = await inviteCodeGate.validate(parsed.data)
  if (!invite.accepted) {
    return json(403, {
      ok: false,
      error: "invite-code-not-accepted",
      message: "Invite code was not accepted by the local friends-beta stub.",
      invite,
    })
  }

  return json(200, {
    ok: true,
    invite,
    boundary: "Local invite-code gate only. No real auth, user provisioning, token storage, or external calls.",
  })
}

export function routeSaasRequest(
  request: RouteRequest,
  env: RuntimeEnv,
  dependencies: SaasRouteDependencies = {},
): ResponsePayload | Promise<ResponsePayload> | undefined {
  const path = request.url.pathname
  const store = dependencies.store ?? defaultStore
  const inviteCodeGate = dependencies.inviteCodeGate ?? defaultInviteCodeGate

  if (request.method === "GET" && path === "/app/readiness") {
    return readiness(env)
  }
  if (request.method === "GET" && path === "/app/security") {
    return securityReadiness()
  }
  if (request.method === "POST" && path === "/friends-beta/invite/validate") {
    return validateFriendsBetaInvite(request, inviteCodeGate)
  }
  if (request.method === "POST" && path === "/saas/bootstrap-demo") {
    return bootstrapDemo(env, store)
  }
  if (request.method === "GET" && path === "/saas/accounts") {
    return accountMetadata(store)
  }
  if (request.method === "POST" && path === "/saas/inbox/import-preview") {
    return importPreview(request, store)
  }

  return undefined
}
