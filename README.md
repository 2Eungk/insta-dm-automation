# Insta DM Automation

Local-first Instagram DM/comment review dashboard for generic social inbox automation. This repo intentionally uses mock events only: no Meta API, no secrets, no backend, and no real Instagram sending.

## Features

- Vite + React + TypeScript single-page app
- Mock Instagram DM/comment inbox
- Classifications: 상품문의, 가격/견적, 예약/일정, 고객지원/불만, 제휴/협업, 스팸, 기타
- Extracted fields: 의도/주제, 상품/서비스, 지역/채널, 요청 일시, 예산/가격, 연락처, 주문/예약번호, 누락정보
- Neutral Korean business-tone draft replies with missing-info questions
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
