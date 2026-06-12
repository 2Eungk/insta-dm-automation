# Insta DM Automation

Local-first Instagram DM/comment review dashboard for filming inquiries. This repo intentionally uses mock events only: no Meta API, no secrets, no backend, and no real Instagram sending.

## Features

- Vite + React + TypeScript single-page app
- Mock Instagram DM/comment inbox
- Classifications: 촬영문의, 견적문의, 일정문의, 협업, 스팸, 기타
- Extracted lead fields: 촬영종류, 지역, 희망일, 예산, 연락처, 누락정보
- Korean draft reply generation in a FlowStore/video director tone
- Human-in-the-loop statuses: 신규, 초안작성, 승인됨, 보류, 무시
- Editable drafts, mock approve/send-log, localStorage persistence
- Search and classification/status filters
- Visible notice that Instagram/Meta sending is not connected

## Run

```bash
npm install
npm run dev
```

Open the local Vite URL printed by the dev server, usually `http://127.0.0.1:5173`.

## Check

```bash
npm run lint
npm run build
```

`npm run build` runs TypeScript first and then creates the Vite production bundle.
