# Server SaaS Foundation

This repository now has a local, production-oriented backend scaffold for an Instagram DM automation SaaS. It is intentionally not deployed and does not connect paid services, collect new secrets, send messages, create webhook subscriptions, or persist raw Meta payloads.

## Lean Architecture

The local backend models these production boundaries:

- `users`: workspace actors with owner/operator/viewer roles.
- `workspaces`: tenant boundary for billing, policy, data retention, and access control.
- `instagram_accounts`: account metadata only, scoped to a workspace.
- `oauth_tokens`: encrypted token custody abstraction. Local dev uses `DEV_ENCRYPTION_KEY`; production must use KMS or managed secret encryption.
- `audit_logs`: redacted, tenant-scoped operational evidence.
- `inbox_items`: imported review rows. Live text bodies are not stored; only `textPresent` is kept.
- `reply_drafts`: human-reviewable draft state, separate from sends.
- `approval_events`: immutable approval/hold/reject evidence before any send path exists.
- `webhook_events`: dedupe records with `meta:<workspaceId>:<providerEventId>` shape and `payloadStored: false`.

Privacy boundary: every persisted row must include `workspaceId` except global user identity. Token values are never returned from routes. Raw Meta webhook payloads are dry-run inputs only and must not be stored in production tables.

## Local Modules

- `server/saasTypes.ts`: shared domain records.
- `server/saasCrypto.ts`: token encryption abstraction backed by local `DEV_ENCRYPTION_KEY`.
- `server/saasPersistence.ts`: `SaasStore` interface with in-memory and JSON-file dev stores.
- `server/saasAudit.ts`: audit metadata redaction.
- `server/saasWebhook.ts`: mock/live import preview normalization with dedupe ids.
- `server/saasRoutes.ts`: local readiness, demo bootstrap, account metadata, and inbox import preview routes.

Routes:

- `GET /app/readiness`
- `POST /saas/bootstrap-demo`
- `GET /saas/accounts`
- `POST /saas/inbox/import-preview`

## Deployment Options

Prices below are planning estimates, not quotes. Verify current pricing before purchase on the official provider pages.

| Tier | Use | Possible stack | Estimated monthly range |
| --- | --- | --- | --- |
| Free/local | Development and demos only | Vite, local Node server, in-memory or JSON file store | `$0` |
| Lean paid | First private beta with a few tenants | Vercel Pro or similar runtime, Supabase/Postgres starter, managed secrets, basic logging | roughly `$45-$125+` |
| Growth | More tenants, support, backups, higher retention | Paid runtime team plan, managed Postgres with backups, queue/worker, observability, WAF/rate limits | roughly `$150-$600+` |

Vercel currently advertises a free Hobby plan and Pro from `$20/month` plus usage. Supabase has a public pricing page for database/storage tiers, but verify the exact plan and add-ons before buying.

## Production Gates

Do not deploy for paying users until these are done:

- Replace local persistence with Postgres/Supabase and tenant-scoped row-level access.
- Replace `DEV_ENCRYPTION_KEY` with managed KMS/secret encryption and rotation.
- Add durable webhook replay protection, signature verification, and raw-payload deletion policy.
- Complete Meta app review and business verification for the exact Instagram permissions.
- Add approval-based send queue, rate limits, cancellation, billing, support, and abuse handling.
- Add backups, audit-log retention policy, incident logging, and data deletion/export flows.

## Offline Verification

`npm run check` now includes `scripts/saas-foundation-smoke-check.mjs`. The check builds the server modules with esbuild and verifies:

- readiness route safety flags;
- demo workspace/account/token bootstrap;
- encrypted token value is never returned;
- audit metadata redacts token, text, and raw payload fields;
- mock import preview redacts fixture text;
- live import preview stores only `textPresent`;
- webhook dedupe ids use the `meta:<workspaceId>:<providerEventId>` shape.
