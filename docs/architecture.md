# Insta DM Automation Architecture

## Goal

Build a local-first Instagram DM/comment inquiry assistant for filming work.

Initial mode is **human-in-the-loop**: classify incoming messages, extract lead details, draft a reply, and let the user approve or edit before any real send.

## MVP scope

### MVP 0.1 — Mock inbox

- Mock Instagram DM/comment events
- Inquiry type classification
- Lead field extraction
- Korean filming reply draft templates
- Status workflow: `new`, `drafted`, `approved`, `ignored`
- No real Meta tokens or outbound send

### MVP 0.2 — Local dashboard

- Inbox list
- Lead quality / category badges
- Extracted fields
- Reply draft editor
- Approve / hold / ignore actions
- Local persistence only

## Core modules

```txt
Event Source
  -> mock Instagram events now
  -> Meta webhook later

Normalizer
  -> normalize DMs/comments into one event shape

Classifier
  -> filming inquiry / price / schedule / collaboration / spam / other

Lead Extractor
  -> project type, date, location, budget, deliverable, contact hints

Reply Draft Engine
  -> Korean reply template + missing-info question

Review Dashboard
  -> user reviews, edits, approves

Send Adapter
  -> mock send log now
  -> Meta Graph API later, only after permission review
```

## Lottie / motion layer

Reference: https://github.com/diffusionstudio/lottie

Use `diffusionstudio/lottie` as an optional UI polish harness for production-ready Lottie animations generated with Codex/Claude Code.

Good first animation candidates:

- Empty inbox: soft paper-plane / DM bubble idle loop
- New inquiry detected: small sparkle on lead card
- Draft ready: writing cursor / message bubble reveal
- Approved: gentle checkmark send animation
- Waiting for Meta connection: plug / webhook status animation

Rules:

- Lottie is **not** part of the automation core.
- Dashboard must work without animation.
- Keep motion lightweight and reduced-motion friendly.
- Do not add heavy animation dependencies until the base dashboard works.
- No external network dependency for runtime animation assets; store JSON locally if used.

## Real Instagram integration prerequisites

- Instagram Business or Creator account
- Connected Facebook Page
- Meta Developer App
- Webhook callback endpoint
- Token storage plan
- Permission review for Instagram messaging APIs
- Privacy / automated-response disclosure copy

## Safety / compliance defaults

- No secret values in repo or chat
- No auto-send in early MVP
- No spammy outbound sequences
- No scraping private Instagram pages
- Every generated reply should be reviewable before send

## Suggested next build task

Build MVP 0.1 + 0.2 as a local React/Vite app:

- mock inbox data
- classifier/extractor functions with tests
- reply templates for filming inquiries
- dashboard UI
- localStorage persistence
- mock send log
- release check command

Defer real Meta API and Lottie animation implementation until after the local dashboard flow is usable.
