# Meta Connection Step 3: Safe Long-Lived Token Exchange

This step adds an explicit local long-lived token exchange. It does not rotate `.env` automatically, send Instagram messages, subscribe webhooks, persist webhook payloads, or expose access tokens in HTTP responses.

## Safety Rules

- Keep `.env` local. It is ignored by git.
- Never paste `META_ACCESS_TOKEN`, `META_LONG_LIVED_ACCESS_TOKEN`, or `META_APP_SECRET` into source files, docs, issues, chat, screenshots, logs, or shared terminal output.
- The HTTP route never returns the token. It returns only whether a token was received and the expiration duration when Meta provides one.
- The local CLI writes the token into `.env` only when you run it yourself.
- The CLI creates `.env.bak` before updating `.env`; both files are ignored by git.

## Local Setup

1. Copy `.env.example` to `.env` if needed.
2. Set these values locally:
   - `META_ACCESS_TOKEN`: the short-lived Instagram access token to exchange.
   - `META_APP_SECRET`: your Meta app secret.
   - `META_LONG_LIVED_ACCESS_TOKEN`: optional placeholder; the CLI can add or update it.
3. Export the variables before using the server route:

```sh
set -a
source .env
set +a
npm run server:dev
```

## HTTP Route

The route performs the exchange only when you explicitly call it:

```sh
curl -s -X POST "http://127.0.0.1:8787/auth/meta/exchange-long-lived?return_token=false"
```

Expected sanitized success shape:

```json
{
  "ok": true,
  "tokenReceived": true,
  "expiresInSeconds": 5184000,
  "instructions": "The token is intentionally omitted from this HTTP response. Run npm run meta:exchange-long-lived locally to save it into .env."
}
```

Use the dry run to verify local env readiness without calling Meta:

```sh
curl -s -X POST "http://127.0.0.1:8787/auth/meta/exchange-long-lived?dry_run=true"
```

`return_token=false` is the default. Requests for `return_token=true` are rejected because HTTP responses must not expose access tokens.

## Local CLI Writer

Run this only on your own machine when you are ready to update local `.env`:

```sh
npm run meta:exchange-long-lived
```

The command reads `META_ACCESS_TOKEN` and `META_APP_SECRET` from `.env`, calls Meta, writes `META_LONG_LIVED_ACCESS_TOKEN` into `.env`, and creates `.env.bak`. It prints only status, backup path, and `expiresInSeconds` when available; it does not print the token, app secret, request URL, or access token.

## Offline Smoke Checks

Run:

```sh
npm run check
```

The long-lived token smoke check uses mocked fetch calls and temporary `.env` files. It verifies missing-env handling, dry-run behavior, HTTP token-return rejection, sanitized Meta errors, sanitized success responses, CLI `.env` writing, backup creation, and no token or secret leakage in outputs.
