# Meta Connection Step 2: Read-Only Instagram Token Check

This step adds one local read-only Graph API check for a token you already store in `.env`. It does not exchange OAuth codes, refresh tokens, persist tokens, send Instagram messages, subscribe webhooks, or store webhook events.

## Token Safety Rules

- Keep `.env` local. It is ignored by git.
- Never paste `META_ACCESS_TOKEN` into source files, docs, issues, chat, screenshots, logs, or terminal output you plan to share.
- Do not commit `.env`, `.server/`, terminal transcripts, or copied response URLs.
- The local server reads `META_ACCESS_TOKEN` from the process environment and never returns it in JSON.
- `GET /auth/meta/callback` still validates code presence only. Token exchange remains intentionally not implemented.

## Local Setup

1. Copy `.env.example` to `.env` if you have not already.
2. Set these values locally:
   - `META_ACCESS_TOKEN`: your local Meta/Instagram access token.
   - `META_GRAPH_API_VERSION`: optional. Defaults to `v23.0`.
3. Export the variables into the server process:

```sh
set -a
source .env
set +a
npm run server:dev
```

## Read-Only Verification

With the local server running, call either endpoint:

```sh
curl -s http://127.0.0.1:8787/instagram/me
curl -s http://127.0.0.1:8787/auth/meta/token-status
```

Expected success shape:

```json
{
  "ok": true,
  "username": "your_instagram_username",
  "user_id_present": true,
  "id_present": false
}
```

If `META_ACCESS_TOKEN` is missing, the endpoint returns `setup-required`. If Meta rejects the token, the endpoint returns only a sanitized Meta error code and message. The token is never included in the response.

## Offline Smoke Checks

Run:

```sh
npm run check
```

The smoke check uses a mocked fetch layer, so it does not need a real token and does not call Meta. It verifies missing-token handling, successful `/me` parsing, sanitized Meta errors, and token redaction.
