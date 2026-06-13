# Local security hardening checklist

This repo is still a local/friends-beta candidate, not a public SaaS. These controls reduce accidental exposure while testing with a local Meta token.

## Implemented local controls

- Server binds to `127.0.0.1` in `npm run server:dev`.
- Host guard rejects non-loopback `Host` headers to reduce DNS-rebinding style local access.
- CORS only reflects loopback browser origins (`127.0.0.1`, `localhost`, `[::1]`); hostile origins receive `access-control-allow-origin: null`.
- Security headers are added to all local server responses:
  - `x-content-type-options: nosniff`
  - `x-frame-options: DENY`
  - `referrer-policy: no-referrer`
  - `permissions-policy: camera=(), microphone=(), geolocation=(), payment=()`
  - `cross-origin-resource-policy: same-site`
  - `x-robots-tag: noindex, nofollow`
- POST routes require `application/json` and keep the 256 KiB body limit.
- In-memory rate limits protect local sensitive paths from accidental loops.
- Invite-code validation caps length and allowed characters, and never echoes the raw attempted code.
- `/app/security` reports non-secret security status only.

## Still required before real deployment

- Cloud Run ingress/IAM decisions and HTTPS-only URLs.
- Secret Manager for Meta tokens and app secrets.
- Per-tester account deletion/token deletion flow.
- Production audit logging with PII minimization.
- Meta App Review, privacy policy, data deletion URL, webhook signature verification.
- Separate staging/prod projects and least-privilege service accounts.

## Local token caution

A local `.env` may contain a long-lived Meta token. Do not screen-share, commit, upload logs, or paste terminal output that includes `.env` contents. If unsure, rotate the token before inviting testers.
