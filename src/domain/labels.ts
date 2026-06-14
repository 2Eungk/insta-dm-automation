import type { AuditAction, Classification, MissingField, ReplyTone, Status, WorkspacePreset } from "./types"

export const CLASSIFICATION_LABELS: Record<Classification, string> = {
  product: "상품문의",
  quote: "가격/견적",
  booking: "예약/일정",
  support: "고객지원/불만",
  partnership: "제휴/협업",
  spam: "스팸",
  other: "기타",
}

export const STATUS_LABELS: Record<Status, string> = {
  new: "신규",
  drafted: "초안작성",
  approved: "승인됨",
  hold: "보류",
  ignored: "무시",
}

export const WORKSPACE_PRESET_LABELS: Record<WorkspacePreset, string> = {
  generic: "공통 문의",
  ecommerce: "쇼핑몰/상품",
  bookingService: "예약/서비스",
  creatorCommunity: "크리에이터/커뮤니티",
  customerSupport: "고객응대",
}

export const REPLY_TONE_LABELS: Record<ReplyTone, string> = {
  friendly: "친절한",
  concise: "간결한",
  professional: "전문적인",
  casual: "캐주얼",
}

export const MISSING_FIELD_LABELS: Record<MissingField, string> = {
  topic: "의도/주제",
  productOrService: "상품/서비스",
  locationOrChannel: "지역/채널",
  requestedDateTime: "요청 일시",
  budgetOrPrice: "예산/가격",
  contact: "연락처",
  orderOrReservationRef: "주문/예약번호",
}

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  "status-change": "상태 변경",
  "draft-regenerated": "초안 재생성",
  "mock-send": "목업 기록",
  "sample-reset": "샘플 초기화",
}
