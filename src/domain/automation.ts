import { CLASSIFICATION_LABELS, MISSING_FIELD_LABELS } from "./labels"
import { CLASSIFICATIONS, type Classification, type MissingField } from "./types"

export type AutomationRule = {
  readonly id: string
  readonly title: string
  readonly ruleType: "classification" | "priority" | "missing-info"
  readonly criteria: readonly string[]
  readonly outcome: string
}

const missingInfoRequirements: Record<Classification, readonly MissingField[]> = {
  product: ["productOrService", "budgetOrPrice"],
  quote: ["topic", "productOrService", "budgetOrPrice", "contact"],
  booking: ["requestedDateTime", "locationOrChannel", "contact"],
  support: ["orderOrReservationRef", "contact"],
  partnership: ["topic", "requestedDateTime", "contact"],
  spam: [],
  other: ["topic", "contact"],
}

export const AUTOMATION_RULES: readonly AutomationRule[] = [
  {
    id: "classification-keywords",
    title: "분류 룰",
    ruleType: "classification",
    criteria: ["재고/가격/예약/환불/제휴/링크 문구", "메시지 본문 키워드", "스팸성 URL 신호"],
    outcome: "문의 유형과 신뢰도를 로컬에서 계산합니다.",
  },
  {
    id: "priority-signals",
    title: "우선순위 룰",
    ruleType: "priority",
    criteria: ["스팸 후보", "환불·취소·불편 등 긴급 지원", "연락처 또는 필수 정보 누락"],
    outcome: "High, Needs review, Normal 배지로만 표시하고 자동 전송하지 않습니다.",
  },
  {
    id: "missing-fields",
    title: "누락정보 룰",
    ruleType: "missing-info",
    criteria: ["분류별 필수 필드", "연락처", "주문/예약번호", "희망 일시와 채널"],
    outcome: "답장 초안에 추가 확인 질문을 포함합니다.",
  },
] as const

export function describeMissingInfoRules(): readonly string[] {
  return CLASSIFICATIONS.map((classification) => {
    const label = CLASSIFICATION_LABELS[classification]
    const required = missingInfoRequirements[classification].map((field) => MISSING_FIELD_LABELS[field]).join(", ")
    return `${label}: ${required.length === 0 ? "자동 응답 제한, 필수 요청 없음" : required}`
  })
}
