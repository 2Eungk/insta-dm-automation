# Insta DM Automation

Local-first Instagram DM/comment review dashboard for generic social inbox automation. This repo intentionally uses mock events only: no Meta API, no secrets, no backend, and no real Instagram sending.

## Features

- Vite + React + TypeScript single-page app
- Mock Instagram DM/comment inbox
- Compact demo mode guide for the recommended local walkthrough flow
- First-run checklist for mock-only workflow, human review-before-send, and production setup gaps
- Informational "Ready before Meta" checklist for future real integrations
- Meta connection readiness section with a mock adapter contract for required environment variables, permissions, webhook shapes, and token lifecycle
- Integration dry-run panel that normalizes bundled mock webhook payloads into local inbox previews with validation errors and warnings
- Bundled webhook payload fixtures for DM, comment, message echo, app review edge cases, and permission-denied scenarios
- Switchable sample datasets: generic, ecommerce, booking/service, and customer support
- Classifications: 상품문의, 가격/견적, 예약/일정, 고객지원/불만, 제휴/협업, 스팸, 기타
- Extracted fields: 의도/주제, 상품/서비스, 지역/채널, 요청 일시, 예산/가격, 연락처, 주문/예약번호, 누락정보
- Neutral Korean business-tone draft replies with missing-info questions
- Local workspace presets: generic, ecommerce, booking/service, creator/community, customer support
- Persisted reply tone selector: 친절한, 간결한, 전문적인, 캐주얼
- Local reply template builder for each classification and tone, with selected-message preview and reset-to-default
- Local rule editor for keyword groups, operator classification hints, and missing-field requirements
- Template and rule validation warnings for empty templates, missing review-before-send wording, aggressive auto-send language, and unsafe sensitive-link/code requests
- Preset-aware quick-reply hints and local FAQ/knowledge suggestions
- Review intelligence for urgent support, spam risk, missing contact/info, and order/reservation refs
- Local rules/automation preview for classification, priority, and editable missing-info requirements
- Per-message draft quality checklist for personalization, missing-info requests, no auto-send, spam caution, and contact/order ref handling
- Batch inbox selection for human-reviewed status changes: mark hold, ignored, or approved
- Local activity/audit trail for status changes, draft regeneration, and mock send records
- Local JSON/CSV export of review data, including event state, classification, extracted fields, draft, and audit count
- Approval queue summary cards for 신규, 정보 필요, 높은 우선순위, 승인됨
- Local analytics for the currently visible sample/filter set: classification distribution, priority distribution, response status, and missing-info hotspots
- Saved local filter view chips: All, Needs info, High priority, Support queue, Spam review, and Approved
- SLA/age indicators on each inbox item for new, older, and urgent messages based on `receivedAt`
- Keyboard shortcut help panel with local-only shortcuts for search focus, next/previous message, approve, hold, and JSON export
- Human-in-the-loop statuses: 신규, 초안작성, 승인됨, 보류, 무시
- Editable drafts, mock approve/send-log, localStorage persistence
- Safe localStorage fallbacks for browsers that block storage or contain invalid saved state
- Browser export fallback path when Blob downloads are unavailable or blocked
- Search and classification/status filters with empty-state guidance
- Visible notice that Instagram/Meta sending is not connected

## Feature checklist

- [x] Bundled sample inboxes for generic, ecommerce, booking/service, and support demos
- [x] Local classification, field extraction, SLA labels, saved filter presets, and analytics
- [x] Human review workflow with editable drafts, approve/hold/ignore states, and mock send logs
- [x] Local audit trail for review actions, draft regeneration, mock sends, and sample resets
- [x] Browser-generated JSON/CSV exports stamped as `local-mock-fixtures`
- [x] Helper copy/tooltips for rules preview, analytics scope, audit log scope, export, and sample reset controls
- [x] Deterministic smoke check for sample scenarios, filter presets, SLA labels, JSON metadata, CSV escaping, local config validation, webhook normalization, and dry-run errors
- [ ] Real Instagram/Meta API connection, backend storage, secrets, payments, deployment, or automatic sending

## Demo walkthrough

Use this path for the cleanest local demo:

1. Start the app and confirm the hero notice says Meta sending is not connected.
2. Read the "Demo mode" guide near the top of the dashboard.
3. Pick a sample scenario in "샘플 시나리오" to switch the bundled inbox.
4. Use filter chips such as Needs info, High priority, Support queue, or Spam review.
5. Select one inbox item and inspect classification, extracted fields, missing-info chips, risk signals, FAQ matches, and the Korean draft.
6. Edit the draft, then use 승인, 보류, 무시, or 목업 전송 로그 to show the human-in-the-loop workflow.
7. Open the Meta pre-integration package and switch between bundled webhook fixtures to inspect local dry-run normalization and validation output.
8. Export JSON or CSV as a browser-generated artifact. The export contains local mock review data only.

## Local-only behavior

- Workspace preset and reply tone are stored in `localStorage`.
- Reply template config and local rule config are stored in `localStorage`; reset controls restore deterministic bundled defaults.
- First-run checklist visibility and selected sample dataset are stored in `localStorage`.
- Audit trail entries are stored in `localStorage` and capped locally; they are not sent anywhere.
- If `localStorage` is blocked, unavailable, over quota, or contains invalid JSON, the app falls back to bundled defaults for the current browser session.
- Sample scenario switching uses bundled browser data only. It does not fetch, sync, or call external services.
- Resetting a sample asks for confirmation, then clears only that sample's local states, mock send logs, and related audit entries in the current browser.
- JSON and CSV exports are generated in the browser. The primary path uses `Blob` downloads; if that fails, the app tries a data URL and then a readable local fallback window. No review data is uploaded.
- Changing the preset updates quick-reply hints and FAQ/knowledge matches only; it does not make the app industry-specific.
- Changing the reply tone affects newly generated drafts and the "선택 톤으로 재생성" action.
- Editing templates affects newly generated drafts and the selected-message preview only; it does not create Meta templates or automatic sends.
- Editing local rules can change mock classifications, missing-info chips, and regenerated drafts in the browser only.
- Batch actions only change local review statuses. They do not bypass the human-in-the-loop review model.
- Preset chips, SLA/age labels, analytics, classifications, suggestions, priority signals, and summary counts are computed from local mock data in the browser.
- The Meta readiness contract is static planning data. Environment variable names are placeholders only; no values are read.
- The webhook dry-run panel uses bundled payload objects only. It does not subscribe to webhooks, receive external requests, mutate the sample inbox, or call Meta.
- No network runtime dependencies, Meta API calls, secrets, backend, payments, or deployment are included.

## Real integration boundaries

The in-app "Ready before Meta" checklist is planning content only. It does not configure Meta permissions, create a Facebook Page connection, create a webhook endpoint, store tokens, create retention policy, manage operator roles, submit templates for review, or enforce production controls.

Actual Meta connection remains a hard boundary for this repo state. It requires explicit approval, real secrets, a backend design, secure token storage, webhook verification, and production policy work before any code is added.

The mock adapter contract names the future inputs and event shapes only:

- Required environment variable names: `META_APP_ID`, `META_APP_SECRET`, `META_VERIFY_TOKEN`, `META_REDIRECT_URI`, and `META_PAGE_ID`
- Permission candidates to justify in app review: `instagram_manage_messages`, `instagram_basic`, `pages_manage_metadata`, and `pages_show_list`
- Webhook fixture coverage: DM message, comment, outgoing message echo, app review malformed payload, and permission-denied error
- Token lifecycle planning: short-lived OAuth token, backend long-lived token storage, rotation, and revocation handling

Before connecting any real social account, design and implement these outside this demo:

- Business or creator Instagram account ownership checks
- Facebook Page connection and business asset access review
- Meta app review, required scopes, webhook verification, token storage, and account ownership checks
- Backend audit logging, deletion/retention controls, encryption, and export governance
- Operator roles for reviewer, approver, admin, and audit-only access
- Reply template review, escalation paths, opt-out language, and policy checks
- Monitoring, rate limits, abuse handling, and incident response

## Ready before Meta checklist

- Confirm the Instagram account is a supported business or creator account.
- Confirm the Instagram account is connected to the correct Facebook Page and business assets.
- Prepare Meta app review evidence and permission justification for the intended use case.
- Design a verified webhook endpoint with retries, rate limiting, abuse handling, and observability.
- Store access tokens only in encrypted backend storage with rotation and least-privilege access.
- Publish a privacy disclosure covering message processing, reviewers, deletion requests, and support contacts.
- Define retention windows for messages, exports, audit logs, and operator notes.
- Require a human operator approval flow before any real customer reply is sent.

## Next manual steps and approval gates

Do not start real Meta work until every gate below is explicitly approved in writing.

1. Product approval gate: confirm the exact Instagram account, Facebook Page, supported use cases, human-review workflow, retention window, and deletion request process.
2. Security approval gate: approve backend architecture, encrypted secret storage, token rotation, audit logging, operator roles, and incident response.
3. Meta app-review gate: approve permission justification, screencast evidence, privacy disclosure, data handling policy, and reviewer test path.
4. Engineering approval gate: approve a backend webhook service plan, verification token handling, retry/rate-limit behavior, observability, and local-to-production migration plan.
5. Implementation gate: only after gates 1-4, add real OAuth, webhook server, Meta API client, secrets, network calls, deployment, and production tests in a separate branch/change.

Until those gates are complete, permitted work is limited to local fixtures, mock adapter contracts, dry-run normalization, README updates, and deterministic checks.

## Acceptance criteria

This demo is acceptable when all of the following are true:

- The first viewport clearly says Meta/Instagram sending is not connected.
- Switching sample scenarios never performs a network request and only uses bundled mock events.
- The Meta readiness section clearly says dry run only and shows no real env values, tokens, OAuth flow, or API calls.
- Webhook dry-run fixtures normalize DM/comment payloads and surface echo, malformed app-review, and permission-denied warnings/errors without mutating the inbox.
- Template and rule settings persist locally, validate risky content, and reset to deterministic defaults.
- Saved filter chips show the expected local subsets for needs-info, high-priority, support, spam, and approved review.
- Rules preview, analytics, audit trail, sample reset, and export controls explain their local-only scope without blocking the workflow.
- JSON and CSV exports include `sourceContext: local-mock-fixtures`, `networkPolicy: browser-download-only`, and `integrationStatus: no-real-instagram-connection`.
- CSV export correctly quotes commas, double quotes, and line breaks in user-visible fields.
- `npm run check`, `npm run lint`, and `npm run build` complete before handoff.

## Product-readiness workflow

1. Use the first-run checklist to confirm the app is operating in mock-only mode.
2. Pick a sample dataset to test a generic, ecommerce, booking/service, or support queue.
3. Use saved filter chips and local analytics to triage missing-info, high-priority, support, spam, or approved queues.
4. Review classification, extracted fields, risk signals, SLA/age label, and the generated draft before changing status.
5. Use "목업 전송 로그" only to record a local simulated send; it does not contact Instagram or Meta.
6. Export JSON or CSV when you need a local review artifact for QA, handoff, or spreadsheet inspection.

## Keyboard shortcuts

- `/`: focus search
- `J` or `ArrowDown`: next visible message
- `K` or `ArrowUp`: previous visible message
- `A`: approve the selected message
- `H`: hold the selected message
- `Cmd/Ctrl + E`: export local JSON
- `?`: open or close shortcut help

## Run

```bash
npm install
npm run dev
```

Open the local Vite URL printed by the dev server, usually `http://127.0.0.1:5173`.

## Check

```bash
npm run check
npm run lint
npm run build
```

`npm run check` runs a deterministic smoke script against the classifier, extractor, sample scenarios, saved filter presets, SLA labels, JSON export metadata, CSV escaping, local template/rule config validation, and webhook dry-run normalization without adding a test framework.
`npm run build` runs TypeScript first and then creates the Vite production bundle.
