# Meta Connection Step 1: Local OAuth and Webhook Scaffold

This step adds only a local backend scaffold. It does not exchange OAuth codes, store tokens, persist webhook events, send Instagram replies, or call Meta APIs.

## Local Secret Gate

Never commit `.env`. It is already ignored by git.

1. Copy `.env.example` to `.env`.
2. Fill these values locally only:
   - `META_INSTAGRAM_EMBED_URL`: recommended for Instagram Business Login. Paste the Embed URL from Meta App Dashboard > Set up business login.
   - `META_APP_ID`: Meta app ID from the app dashboard. Required only when `META_INSTAGRAM_EMBED_URL` is not set and the local server must construct the authorization URL.
   - `META_REDIRECT_URI`: local callback URL, for example `http://127.0.0.1:8787/auth/meta/callback`. If the Embed URL already includes `redirect_uri`, the local server preserves the dashboard value. If it is absent, the server fills this value.
   - `META_OAUTH_STATE`: a locally generated random string used to bind the OAuth attempt. If the Embed URL already includes `state`, the local server preserves the dashboard value. If it is absent, the server fills this value.
   - `META_OAUTH_PROVIDER`: use `instagram` for Instagram Business Login scopes. Omit it to infer `instagram` from `instagram_business_*` scopes, or set `facebook` only for legacy Facebook Login scopes.
   - `META_OAUTH_SCOPES`: optional comma-separated OAuth scopes. The default is `instagram_business_basic,instagram_business_manage_messages,pages_show_list`.
   - `META_VERIFY_TOKEN`: a locally generated random string that you also enter in Meta's webhook setup.
3. Leave `META_APP_SECRET` in `.env` only for a later token-exchange step. Step 1 does not read it.
4. Export the variables before running the local server:

```sh
set -a
source .env
set +a
npm run server:dev
```

## Meta Developer Setup Gate

Use the official Meta Developer pages as the source of truth because the dashboard UI can change:

- App creation: https://developers.facebook.com/docs/development/create-an-app/
- Instagram Platform: https://developers.facebook.com/docs/instagram-platform/
- Webhooks: https://developers.facebook.com/docs/graph-api/webhooks/getting-started/

Manual setup:

1. Open Meta for Developers and create or select the app that will own this Instagram integration.
2. Add an Instagram-capable product in the app dashboard. Use the Instagram Platform option that matches business login and messaging review for your app.
3. In App Dashboard > Set up business login, copy the Embed URL into local `.env` as `META_INSTAGRAM_EMBED_URL`. Do not paste a redirect result, OAuth callback URL, access token URL, or app secret.
4. If the Embed URL is unavailable, use the generated fallback by copying the app ID into `META_APP_ID`, keeping `META_OAUTH_PROVIDER=instagram`, and setting `META_REDIRECT_URI` plus `META_OAUTH_STATE`.
5. In OAuth or login settings, add `http://127.0.0.1:8787/auth/meta/callback` as a valid redirect URI for local testing.
6. In webhook settings, add a callback URL that points to this local route when exposed through a local tunnel: `/webhook/meta`.
7. Enter the exact same local `META_VERIFY_TOKEN` value in Meta's webhook verify-token field.
8. Subscribe only to Instagram webhook fields needed for later review, such as messages and comments. Do not enable production delivery until token exchange, storage, and permission review gates are implemented.

## Local Endpoint Gate

Run the local server:

```sh
npm run server:dev
```

Available endpoints:

- `GET /health`: confirms the local scaffold is up.
- `GET /auth/meta/start`: returns the validated `META_INSTAGRAM_EMBED_URL` when it is set and the provider is `instagram`. The URL must be `https://www.instagram.com/oauth/authorize` and must not contain `access_token`, `code`, or `client_secret` parameters. The server fills `redirect_uri` and `state` only when they are absent from the Embed URL. If no Embed URL is set, the generated fallback uses `META_APP_ID`, `META_REDIRECT_URI`, `META_OAUTH_STATE`, and the configured scopes. Set `META_OAUTH_PROVIDER=facebook` only when using legacy Facebook Login scopes.
- `GET /auth/meta/callback`: validates that an OAuth `code` exists, then stops. It does not exchange the code.
- `GET /webhook/meta`: verifies Meta's `hub.verify_token` against local `META_VERIFY_TOKEN` and returns the challenge text.
- `POST /webhook/meta`: accepts JSON, normalizes it through the existing mock webhook normalizer, and returns a dry-run preview. It does not persist or call outbound APIs.

## Verification Gate

Run:

```sh
npm run check
```

The check script validates:

- `/health` returns local Step 1 metadata.
- `/auth/meta/start` returns a setup error when env values are missing.
- `/auth/meta/start` returns an Instagram OAuth authorization URL by default.
- `/auth/meta/start` returns the Meta dashboard Embed URL override when `META_INSTAGRAM_EMBED_URL` is set for Instagram Business Login.
- `/auth/meta/start` rejects Embed URLs that carry OAuth codes, access tokens, or client secrets.
- `/webhook/meta` returns the challenge when the verify token matches.
- `/webhook/meta` rejects a mismatched verify token.
- `POST /webhook/meta` returns a dry-run normalized preview from bundled fixtures.

Proceed to Step 2 only after you decide where secrets and long-lived tokens will be stored. Do not add token exchange or Graph API calls to this scaffold.
