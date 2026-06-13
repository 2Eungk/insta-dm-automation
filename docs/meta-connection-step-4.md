# Meta Connection Step 4: Read-Only Live Inbox Diagnostics

This step adds a local read-only diagnostics scaffold for checking whether the current Meta token and Instagram account can read account identity, conversations, message previews, and comment previews. It does not send messages, auto-reply, persist webhook payloads, create webhook subscriptions, deploy anything, or print access tokens.

## Safety Boundaries

- `META_LONG_LIVED_ACCESS_TOKEN` is preferred over `META_ACCESS_TOKEN`.
- Token values are never returned by HTTP routes, rendered in the browser, written to docs, or printed by tests.
- Live preview rows expose IDs, timestamps, usernames when Meta returns them, and text-presence booleans. They do not render DM or comment body text.
- The local server performs only explicit GET diagnostics for account identity, conversations, messages, and comments.
- The route does not create webhook subscriptions, subscribe fields, persist responses, enqueue replies, or call any send endpoint.
- The browser panel calls only the local server at `http://127.0.0.1:8787/instagram/live-inbox`.

## Local Setup

Set these values in your local `.env`, then export them into the local server process:

```sh
set -a
source .env
set +a
npm run server:dev
```

Relevant variables:

- `META_LONG_LIVED_ACCESS_TOKEN`: preferred local token for Step 4 diagnostics.
- `META_ACCESS_TOKEN`: fallback token when no long-lived token is set.
- `META_IG_USER_ID`: Instagram professional account ID used for Graph conversation, media, and comment checks.
- `META_GRAPH_API_VERSION`: optional; defaults to the repo's configured Graph version.

Keep `.env` local and ignored by git. Do not paste token values into terminal transcripts, screenshots, tickets, docs, or chat.

## HTTP Route

Run the local server, then call:

```sh
curl -s "http://127.0.0.1:8787/instagram/live-inbox"
```

The route returns HTTP 200 for diagnostic outcomes so the UI can show partial readiness without crashing. Capability statuses use:

- `ok`: the mocked or live read-only request succeeded.
- `permission-required`: Meta rejected the request with a permission or app-review style error.
- `not-available`: the endpoint did not return a usable read-only response, or no preview row exists.
- `setup-required`: required local configuration is missing or the token is invalid/expired.

The same route is also available at:

```sh
curl -s "http://127.0.0.1:8787/auth/meta/live-inbox"
```

## Browser Panel

Start the Vite app and the local Meta server in separate terminals:

```sh
npm run dev
npm run server:dev
```

Open the Vite URL, then use the "Instagram live inbox diagnostics" panel below the mock Meta readiness package. The mock inbox remains the primary workflow. The live panel is opt-in and can be turned off without changing mock review state.

## Permission Caveats

Meta Graph endpoints for Instagram messaging and comments can require account type, business asset connection, app mode, app review, and permissions. Depending on the app and account, conversation, message, media, or comment reads may return `permission-required` even when the token is syntactically valid.

Treat `permission-required` as an app-review/setup result, not as an application crash. The route intentionally continues returning structured diagnostics so you can see which capability is blocked.

## Offline Smoke Checks

Run:

```sh
npm run check
```

The live inbox smoke check uses mocked fetch calls only. It verifies:

- long-lived token preference over short-lived token fallback
- missing-env `setup-required` statuses
- mocked account/conversation/message/comment success
- permission error classification
- invalid token classification
- no token or customer message body leakage in responses

No smoke check reads the real `.env`, calls Meta, sends messages, creates webhooks, deploys, or pushes.
