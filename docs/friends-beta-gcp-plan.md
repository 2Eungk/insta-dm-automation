# Friends Beta GCP Plan

This is a local-only readiness plan for an invite-only friends beta. Do not deploy, push, create paid resources, collect new secrets, send Instagram messages, or create real webhook subscriptions from this repository step.

## Launch Shape

Target: 3-5 trusted acquaintances who understand the tool is a private beta, not a public SaaS.

The first beta should stay manual:

- Invite testers one by one with an admin-issued local invite code.
- Onboard through a direct conversation, not public marketing.
- Keep the product read-only or approval-only.
- Do not auto-send replies.
- Before any real outbound send path exists, enforce anti-lock throttles: no batch sends, 45-second minimum gap, max 1/min, 3/5min, 5/10min, 10/30min, 15/hour, and 1-hour per-recipient cooldown.
- Do not create production webhook subscriptions.
- Do not accept payments.
- Keep a visible token deletion path before any tester connects an account.
- Confirm the friend understands and consents to what account data may be checked.
- Do not market publicly until Meta app review and business verification are complete.

## Minimal GCP-ish Path

Option A is the cheapest operational path:

- One Cloud Run service for the server and static UI.
- One admin invite code or admin-managed allowlist.
- In-memory or local file state for the first private walkthrough only.
- No Firebase Auth, no Firestore, no Secret Manager until a real account connection is needed.

Option B is the smallest serious beta path:

- Cloud Run for the app server with min instances set to zero.
- Firestore for tenant/workspace metadata, audit records, and invite status.
- Secret Manager for Meta app secrets and encrypted-token custody material.
- Firebase Auth or Identity Platform only if tester sign-in becomes necessary; otherwise keep manual admin invites.

Option C is the public SaaS path and is out of scope:

- Real auth, tenant isolation, billing, production webhook subscriptions, approval-based send queue, rate limits, data deletion/export, support, monitoring, and incident process.

## Cost Notes

All pricing below is a rough planning estimate, not a quote. Verify current pricing before buying or enabling billing:

- Cloud Run: likely free-to-small for a 3-5 tester beta if traffic is low and min instances stay at zero. Official pricing lists request-based free tier allowances and usage-based charges: https://cloud.google.com/run/pricing
- Firestore: likely free-to-small for tiny metadata volumes. Official pricing lists one free database per project with free daily read/write/delete and storage quotas, then usage-based charges: https://cloud.google.com/firestore/pricing
- Secret Manager: likely free-to-small for a handful of secret versions and low access volume. Official pricing lists free monthly allowances for active secret versions and access operations, then usage-based charges: https://cloud.google.com/secret-manager/pricing
- Firebase Auth or Identity Platform: optional for this beta. Email/social sign-in can be free at small MAU counts, but phone/MFA/SAML/OIDC details vary by tier and region: https://cloud.google.com/identity-platform/pricing

Expected private beta range: `$0-$10/month` if everything stays tiny and free-tier eligible. Budget guardrail: treat anything above `$25/month` as a stop-and-review signal before continuing.

## Readiness Boundary

The repo can be a friends beta candidate while public SaaS readiness remains false.

Friends beta candidate requires:

- `productionReady: false`
- `friendsBetaCandidate: true`
- `sendsMessages: false`
- `createsWebhookSubscriptions: false`
- `acceptsPayments: false`
- `exposesTokenValues: false`
- raw Meta payload storage remains disabled
- outbound automation remains `approval-only-throttled` with `autoSendEnabled: false` and `batchSendsAllowed: false`

If any send, webhook subscription, payment, raw-payload storage, or token exposure path becomes true, friends beta candidate must become false until the risk is removed.

## Local Invite Gate

The current invite gate is a stub:

- It validates a local code behind a server interface.
- It creates no users and no sessions.
- It stores no secrets.
- It returns only a redacted code preview.
- It is covered by offline smoke checks.

Before any hosted beta, replace the stub with a durable invite table, expiration, one-use redemption, audit logging, and an explicit tester removal path.

## Token Deletion Path

Before a friend connects a real Instagram account, the app needs a simple deletion path:

- Remove stored token material for that tester/workspace.
- Stop any active imports or diagnostics using that token.
- Preserve a redacted audit event that deletion was requested and completed.
- Confirm deletion back to the tester manually.

No real token deletion can be verified in this local-only step because no real token should be collected here.
